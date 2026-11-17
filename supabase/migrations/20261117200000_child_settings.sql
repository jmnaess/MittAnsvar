-- Steg 10a, tillegg: «Innstillinger» på barnets enhet. Se docs/DATABASE.md §5.
--
-- 1. Et barn kan velge ny avatar på sin egen profil, og ingenting annet.
--    Hvorfor RPC og ikke en RLS-policy? Kolonnerettigheter gjelder hele rollen authenticated,
--    altså både voksne og barn. En update-policy for barn ville derfor også latt barnet endre
--    navn og fødselsår (som voksne har kolonnerett til). En RPC som bare tar avataren, er stram.
-- 2. «Logg ut av denne enheten» kobler også fra. En vanlig utlogging ville latt barneprofilen
--    stå koblet til en anonym bruker som ingen kan logge inn som igjen.
--
-- Feil (errcode P0001, nøkkel som melding, se src/lib/errors.ts):
--   set_my_avatar:   not_authenticated, invalid_avatar, member_not_found
--   unlink_my_device: invalid_member (kalleren er ikke et barn på egen enhet)

-- ---------------------------------------------------------------------------
-- set_my_avatar: endrer avataren på kallerens egen members-rad (voksen eller barn).
-- Avataren er en nøkkel til en innebygd illustrasjon (src/features/household/avatars.ts).
-- Vi sjekker bare formen, ikke listen, så en nyere appversjon kan legge til nye.
-- ---------------------------------------------------------------------------
create function public.set_my_avatar(p_avatar text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_avatar is null or p_avatar !~ '^[a-z_]{1,30}$' then
    raise exception 'invalid_avatar' using errcode = 'P0001';
  end if;

  update public.members set avatar = p_avatar where auth_user_id = auth.uid();
  if not found then
    raise exception 'member_not_found' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- unlink_my_device: barnet kobler fra sin egen enhet (fra «Logg ut av denne enheten»).
-- Samme som unlink_member_device, men for seg selv: auth_user_id = null, og den anonyme
-- brukeren slettes. Appen logger deretter ut lokalt.
-- ---------------------------------------------------------------------------
create function public.unlink_my_device()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  me public.members;
begin
  select * into me from public.members where auth_user_id = auth.uid() for update;

  -- Bare et barn på egen (anonym) enhet. En voksen logger ut på vanlig måte.
  if not found
     or me.role <> 'child'
     or not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  update public.members set auth_user_id = null where id = me.id;
  perform private.delete_anonymous_users(array[auth.uid()]);
end;
$$;

revoke execute on function public.set_my_avatar(text)  from public, anon;
grant  execute on function public.set_my_avatar(text)  to authenticated;
revoke execute on function public.unlink_my_device()   from public, anon;
grant  execute on function public.unlink_my_device()   to authenticated;
