-- Bare eget navn, egen figur og eget profilbilde for voksne.
-- Utvider 20261124090000_own_adult_name.sql: en voksen kan ikke endre navn, figur (avatar),
-- visning (avatar_mode) eller bilde (photo_path og filene i member-photos) på en annen voksen.
-- Barnas profiler kan alle voksne i husstanden fortsatt endre. Barnet velger selv figur og
-- figur/bilde via set_my_avatar og set_my_avatar_mode (egen rad, old.role = 'child').
-- Uten innlogget bruker (auth.uid() er null: superbruker, service-rolle) gjelder ikke regelen.
-- Edge delete-account sletter filene med service-rollen, som går forbi RLS.
--
-- Feilnøkler (errcode P0001): not_own_name (navn), not_own_profile (figur, visning, bilde).

-- ---------------------------------------------------------------------------
-- Trigger på members (erstatter members_guard_adult_display_name)
-- ---------------------------------------------------------------------------
drop trigger members_guard_adult_display_name on public.members;
drop function private.guard_adult_display_name();

create function private.guard_other_adult_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null
     or old.role <> 'adult'
     or old.auth_user_id is not distinct from auth.uid() then
    return new;
  end if;

  if new.display_name is distinct from old.display_name then
    raise exception 'not_own_name' using errcode = 'P0001';
  end if;

  if new.avatar is distinct from old.avatar
     or new.avatar_mode is distinct from old.avatar_mode
     or new.photo_path is distinct from old.photo_path then
    raise exception 'not_own_profile' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger members_guard_other_adult_profile
  before update of display_name, avatar, avatar_mode, photo_path on public.members
  for each row execute function private.guard_other_adult_profile();

-- ---------------------------------------------------------------------------
-- Storage: voksne skriver bare i egen mappe og i barnas mapper.
-- private.photo_member_writable: medlemmet i stien {household_id}/{member_id}/fil er et barn
-- eller den innloggede selv. Samme sti-tolkning som private.photo_household.
-- Husstanden og voksen-rollen sjekkes fortsatt av private.is_adult(private.photo_household(name)).
-- ---------------------------------------------------------------------------
create function private.photo_member_writable(object_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select m.role = 'child' or m.auth_user_id = auth.uid()
    from public.members m
    where array_length(storage.foldername(object_name), 1) = 2
      and m.household_id::text = (storage.foldername(object_name))[1]
      and m.id::text = (storage.foldername(object_name))[2]
  ), false);
$$;

revoke execute on function private.photo_member_writable(text) from public, anon;
grant  execute on function private.photo_member_writable(text) to authenticated;

alter policy member_photos_insert on storage.objects
  with check (
    bucket_id = 'member-photos'
    and private.is_adult(private.photo_household(name))
    and private.photo_member_writable(name)
    and storage.filename(name) ~ '^[0-9a-f-]{36}\.jpg$'
  );

alter policy member_photos_delete on storage.objects
  using (
    bucket_id = 'member-photos'
    and private.is_adult(private.photo_household(name))
    and private.photo_member_writable(name)
  );
