// Edge Function: delete-account
// Sletter den innloggede brukerens konto. Se docs/ARCHITECTURE.md §5 (Sletting).
//
// 1. withSupabase({ auth: 'user' }) sjekker brukerens JWT mot prosjektets JWKS.
//    Uten gyldig innlogging avvises kallet før koden under kjører.
// 2. Profilbildene som forsvinner med kontoen, slettes med Storage-API-et. Hvilke mapper det
//    gjelder, avgjør my_photo_folders_to_delete() kjørt SOM brukeren.
// 3. delete_my_account_data() kjøres SOM brukeren (ctx.supabase), så auth.uid()
//    avgjør hvilke data som slettes. Ingen kan peke på andres data.
// 4. Auth-brukeren slettes med den hemmelige nøkkelen (ctx.supabaseAdmin).
//    Nøkkelen legges inn automatisk av Supabase og finnes aldri i appen eller i Git.
//
// Alle steg er trygge å prøve igjen: tomme mapper hoppes over, og steg 3 gjør ingenting andre gang.
// Logger aldri e-post eller navn.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PHOTO_BUCKET = "member-photos";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }

    const userId = ctx.userClaims!.id;

    // Profilbildene først. Databasen kan ikke slette filer selv (Supabase stopper DELETE på
    // storage.objects med SQL), og etter steg 3 finnes ikke medlemmene lenger. Feiler dette,
    // slettes ikke kontoen, og brukeren kan prøve igjen.
    // Mappene hentes som brukeren (samme regler som delete_my_account_data), filene slettes med
    // den hemmelige nøkkelen. Ett nytt forsøk per mappe ved feil, som for auth-brukeren under.
    const { data: folders, error: foldersError } = await ctx.supabase.rpc("my_photo_folders_to_delete");
    if (foldersError) {
      console.error("my_photo_folders_to_delete failed:", foldersError.message);
      return Response.json({ error: "delete_photos_failed" }, { status: 500 });
    }

    const photos = ctx.supabaseAdmin.storage.from(PHOTO_BUCKET);
    for (const folder of (folders ?? []) as string[]) {
      let deleted = false;
      for (let attempt = 1; attempt <= 2 && !deleted; attempt++) {
        const { data: files, error: listError } = await photos.list(folder, { limit: 1000 });
        if (listError) {
          console.error(`photo list failed (attempt ${attempt}):`, listError.message);
          continue;
        }
        if (files.length === 0) {
          deleted = true;
          continue;
        }
        const { error: removeError } = await photos.remove(files.map((f) => `${folder}/${f.name}`));
        if (removeError) {
          console.error(`photo remove failed (attempt ${attempt}):`, removeError.message);
          continue;
        }
        deleted = true;
      }
      if (!deleted) return Response.json({ error: "delete_photos_failed" }, { status: 500 });
    }

    const { error: dataError } = await ctx.supabase.rpc("delete_my_account_data");
    if (dataError) {
      console.error("delete_my_account_data failed:", dataError.message);
      return Response.json({ error: "delete_data_failed" }, { status: 500 });
    }

    // Ett nytt forsøk ved serverfeil eller nettverksfeil. Gatewayen kan gi opp etter 10 s med
    // en ren tekstfeil (status 555), som supabase-js ikke klarer å lese som JSON.
    // Ingen status = nettverksfeil eller et svar som ikke var JSON.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
      if (!error) return Response.json({ ok: true });
      // 404 på andre forsøk: det første slettet brukeren, men svaret kom ikke frem.
      if (attempt > 1 && error.status === 404) return Response.json({ ok: true });

      console.error(
        `auth.admin.deleteUser failed (attempt ${attempt}):`,
        error.name,
        error.status,
        error.message,
      );
      const retryable = error.status === undefined || error.status >= 500;
      if (!retryable) break;
    }

    return Response.json({ error: "delete_user_failed" }, { status: 500 });
  }),
};
