-- Profilbilder for medlemmer. Se docs/DATABASE.md §1 (members) og §6 (Storage).
--
-- Bildene ligger i en privat bøtte i Supabase Storage, sti {household_id}/{member_id}/{uuid}.jpg.
-- Nytt filnavn ved hver opplasting: da viser cachen i appen aldri et gammelt bilde.
--
-- Tilgang (RLS på storage.objects):
--   - Lese:            alle medlemmer i samme husstand (også barn med enhet).
--   - Laste opp/slette: bare voksne i husstanden.
--   - Medlemmet må finnes. En fil som blir liggende igjen etter en sletting, kan ingen lese.
--
-- Sletting: Supabase stopper DELETE på storage.objects med SQL (triggeren storage.protect_delete),
-- så filene slettes med Storage-API-et: av appen når et barn fjernes, og av Edge Function
-- delete-account når en konto (og eventuelt hele husstanden) slettes. Se docs/ARCHITECTURE.md §5.
--
-- Feilnøkler (errcode P0001):
--   set_my_avatar_mode: not_authenticated, member_not_found, no_photo

-- ---------------------------------------------------------------------------
-- Kolonner på members
-- ---------------------------------------------------------------------------
create type public.avatar_mode as enum ('figure', 'photo');

alter table public.members
  add column avatar_mode public.avatar_mode not null default 'figure',
  add column photo_path  text,
  -- Stien kan bare peke på medlemmets egen mappe.
  add constraint members_photo_path_own_folder check (
    photo_path is null
    or photo_path ~ ('^' || household_id::text || '/' || id::text || '/[0-9a-f-]{36}\.jpg$')
  ),
  -- Bilde-modus uten bilde gir ingen mening. Fjernes bildet, må modusen settes til figur samtidig.
  add constraint members_photo_mode_needs_photo check (avatar_mode = 'figure' or photo_path is not null);

-- members_update-policyen sørger for at bare voksne kan endre disse.
grant update (photo_path, avatar_mode) on public.members to authenticated;

-- ---------------------------------------------------------------------------
-- set_my_avatar_mode: barnet (eller en voksen) velger figur eller bilde på sin egen profil.
-- Samme mønster som set_my_avatar (20261117200000_child_settings.sql).
-- ---------------------------------------------------------------------------
create function public.set_my_avatar_mode(p_mode public.avatar_mode)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  me public.members;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into me from public.members where auth_user_id = auth.uid() for update;
  if not found then
    raise exception 'member_not_found' using errcode = 'P0001';
  end if;

  if p_mode = 'photo' and me.photo_path is null then
    raise exception 'no_photo' using errcode = 'P0001';
  end if;

  update public.members set avatar_mode = p_mode where id = me.id;
end;
$$;

revoke execute on function public.set_my_avatar_mode(public.avatar_mode) from public, anon;
grant  execute on function public.set_my_avatar_mode(public.avatar_mode) to authenticated;

-- ---------------------------------------------------------------------------
-- my_photo_folders_to_delete: bildemappene som forsvinner hvis kalleren sletter kontoen sin.
-- Kalles av delete-account FØR delete_my_account_data, og følger de samme reglene:
--   - ikke medlem, eller barn:  ingen mapper (barneprofilen tilhører husstanden)
--   - siste voksne:             alle medlemmenes mapper (hele husstanden slettes)
--   - andre voksne finnes:      bare egen mappe
-- Alle mapper tas med, også for medlemmer uten photo_path, i tilfelle en gammel fil ble liggende.
-- ---------------------------------------------------------------------------
create function public.my_photo_folders_to_delete()
returns text[]
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  me record;
  other_adults int;
begin
  select m.id, m.household_id, m.role
    into me
  from public.members m
  where m.auth_user_id = auth.uid();

  if not found or me.role <> 'adult' then
    return '{}';
  end if;

  select count(*)
    into other_adults
  from public.members m
  where m.household_id = me.household_id
    and m.role = 'adult'
    and m.id <> me.id;

  if other_adults > 0 then
    return array[me.household_id::text || '/' || me.id::text];
  end if;

  return array(
    select m.household_id::text || '/' || m.id::text
    from public.members m
    where m.household_id = me.household_id
    order by m.created_at
  );
end;
$$;

revoke execute on function public.my_photo_folders_to_delete() from public, anon;
grant  execute on function public.my_photo_folders_to_delete() to authenticated;

-- ---------------------------------------------------------------------------
-- Bøtta: privat, bare JPEG, maks 1 MB (appen laster opp 512×512, typisk under 100 kB).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', false, 1048576, array['image/jpeg']);

-- ---------------------------------------------------------------------------
-- private.photo_household: husstanden til et bilde, ut fra stien.
-- null hvis stien ikke har formen {household_id}/{member_id}/fil, eller medlemmet ikke finnes
-- i den husstanden. Sammenligner som tekst, så en ugyldig uuid i stien ikke gir feil.
-- ---------------------------------------------------------------------------
create function private.photo_household(object_name text)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.household_id
  from public.members m
  where array_length(storage.foldername(object_name), 1) = 2
    and m.household_id::text = (storage.foldername(object_name))[1]
    and m.id::text = (storage.foldername(object_name))[2];
$$;

revoke execute on function private.photo_household(text) from public, anon;
grant  execute on function private.photo_household(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Policyer på storage.objects (RLS er allerede på i Supabase).
-- Ingen update-policy: appen laster aldri opp over en fil, den lager alltid en ny.
-- ---------------------------------------------------------------------------
create policy member_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'member-photos'
    and private.photo_household(name) in (select private.my_household_ids())
  );

create policy member_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and private.is_adult(private.photo_household(name))
    and storage.filename(name) ~ '^[0-9a-f-]{36}\.jpg$'
  );

create policy member_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'member-photos'
    and private.is_adult(private.photo_household(name))
  );
