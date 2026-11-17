-- Steg 4: oppstart. Oppretter husstanden og den innloggede som første voksne, i én transaksjon.
-- Se docs/DATABASE.md §5 (RPC-oversikt) og docs/ARCHITECTURE.md §4 (prøvetid).
--
-- Regler:
--   - Bare innloggede, ikke-anonyme brukere (barneenheter er anonyme og kan ikke lage husstand).
--   - Én husstand per bruker i MVP: har brukeren allerede en members-rad, avvises kallet.
--   - trial_ends_at settes her på serveren. Klienten har ingen parameter for den.
--
-- Feil kastes med errcode P0001 og en fast nøkkel som melding. Appen oversetter nøkkelen
-- til norsk (src/lib/errors.ts):
--   not_authenticated, anonymous_not_allowed, already_in_household

create function public.create_household(
  p_name         text,
  p_type         public.household_type,
  p_housing_type public.housing_type,
  p_display_name text,
  p_avatar       text
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'anonymous_not_allowed' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.members m where m.auth_user_id = uid) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;

  insert into public.households (name, type, housing_type, trial_ends_at)
  values (btrim(p_name), p_type, p_housing_type, now() + interval '14 days')
  returning id into new_id;

  insert into public.members (household_id, role, display_name, avatar, auth_user_id)
  values (new_id, 'adult', btrim(p_display_name), p_avatar, uid);

  return new_id;
exception
  -- To samtidige kall: sjekken over slipper begge gjennom, men unique(auth_user_id)
  -- stopper det andre. Hele funksjonen rulles da tilbake, så ingen husstand blir
  -- liggende uten voksen.
  when unique_violation then
    raise exception 'already_in_household' using errcode = 'P0001';
end;
$$;

revoke execute on function public.create_household(text, public.household_type, public.housing_type, text, text)
  from public, anon;
grant execute on function public.create_household(text, public.household_type, public.housing_type, text, text)
  to authenticated;
