-- Misbruksvern for anonym innlogging (foreløpig i stedet for CAPTCHA). Se docs/DATABASE.md §5.
--
-- «Jeg er et barn» og «Sett opp familieskjerm» logger inn anonymt før koden løses inn. Hvem som
-- helst kan dermed lage anonyme brukere. Supabase Auth begrenser antallet per IP, men brukere som
-- aldri kobles, ville ellers bli liggende for alltid. En timesjobb sletter dem etter 24 timer.
--
-- «Koblet» betyr barn i members eller skjerm i household_displays. Voksne kan ikke være anonyme
-- (create_household og accept_invite avviser det). E-postbrukere røres aldri.
-- CAPTCHA skal på før offentlig lansering.

-- ---------------------------------------------------------------------------
-- delete_stale_anonymous_users: sletter anonyme brukere eldre enn 24 timer som ikke er koblet.
-- Returnerer antall. p_now gjør den testbar (som roll_over_seasons).
--
-- for update skip locked: løser en gammel anonym bruker inn koden akkurat mens jobben kjører,
-- holder innsettingen i members/household_displays en lås på brukerraden. Da hopper jobben over
-- brukeren i stedet for å slette den rett etter koblingen.
-- ---------------------------------------------------------------------------
create function private.delete_stale_anonymous_users(p_now timestamptz default now())
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  ids uuid[];
begin
  select coalesce(array_agg(s.id), '{}') into ids
  from (
    select u.id
    from auth.users u
    where u.is_anonymous
      and u.email is null -- ekstra sikkerhetsnett: en e-postkonto slettes aldri her
      and u.created_at < p_now - interval '24 hours'
      and not exists (select 1 from public.members m where m.auth_user_id = u.id)
      and not exists (select 1 from public.household_displays d where d.auth_user_id = u.id)
    for update of u skip locked
  ) s;

  perform private.delete_anonymous_users(ids);
  return cardinality(ids);
end;
$$;

revoke execute on function private.delete_stale_anonymous_users(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Timesjobb. Minutt 35, så den ikke kjører samtidig med roll-over-seasons (minutt 5).
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule('delete-stale-anonymous-users', '35 * * * *',
  'select private.delete_stale_anonymous_users()');
