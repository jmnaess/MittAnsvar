// Edge Function: delete-account
// Sletter den innloggede brukerens konto. Se docs/ARCHITECTURE.md §5 (Sletting).
//
// 1. withSupabase({ auth: 'user' }) sjekker brukerens JWT mot prosjektets JWKS.
//    Uten gyldig innlogging avvises kallet før koden under kjører.
// 2. delete_my_account_data() kjøres SOM brukeren (ctx.supabase), så auth.uid()
//    avgjør hvilke data som slettes. Ingen kan peke på andres data.
// 3. Auth-brukeren slettes med den hemmelige nøkkelen (ctx.supabaseAdmin).
//    Nøkkelen legges inn automatisk av Supabase og finnes aldri i appen eller i Git.
//
// Feiler steg 3, er det trygt å prøve igjen: steg 2 gjør da ingenting.
// Logger aldri e-post eller navn.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }

    const userId = ctx.userClaims!.id;

    const { error: dataError } = await ctx.supabase.rpc("delete_my_account_data");
    if (dataError) {
      console.error("delete_my_account_data failed:", dataError.message);
      return Response.json({ error: "delete_data_failed" }, { status: 500 });
    }

    const { error: authError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("auth.admin.deleteUser failed:", authError.message);
      return Response.json({ error: "delete_user_failed" }, { status: 500 });
    }

    return Response.json({ ok: true });
  }),
};
