-- Tester for oppryddingen av ukoblede anonyme brukere. Se docs/DATABASE.md §5 og
-- *_anonymous_cleanup.sql. Alt rulles tilbake.
--
-- Sjekkene ser på testbrukernes id-er, ikke på totalt antall: lokalt kan det ligge rester fra
-- andre skript i auth.users.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.login_as(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function tests.logout()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

create function tests.user_exists(uid uuid)
returns boolean language sql as $$ select exists (select 1 from auth.users where id = uid) $$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   a001 = voksen (e-post, koblet)          e001 = e-postbruker, gammel, ukoblet
--   c001 = anonym, gammel, ukoblet          c002 = anonym, ny, ukoblet
--   c003 = anonym, gammel, koblet som barn  d001 = anonym, gammel, koblet som skjerm
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous, created_at) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen@example.com', false, now() - interval '25 hours'),
  ('00000000-0000-0000-0000-00000000e001', 'ukoblet@example.com', false, now() - interval '25 hours'),
  ('00000000-0000-0000-0000-00000000c001', null, true, now() - interval '25 hours'),
  ('00000000-0000-0000-0000-00000000c002', null, true, now() - interval '1 hour'),
  ('00000000-0000-0000-0000-00000000c003', null, true, now() - interval '25 hours'),
  ('00000000-0000-0000-0000-00000000d001', null, true, now() - interval '25 hours');

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hjem A', 'family', 'house', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen', 'fox', null,
   '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn', 'owl', 2016,
   '00000000-0000-0000-0000-00000000c003');

insert into public.household_displays (household_id, auth_user_id, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-00000000d001',
   'aaaaaaaa-0000-0000-0000-000000000001');

-- ===========================================================================
-- 1. Rettigheter og jobben
-- ===========================================================================
select is((select count(*)::int from cron.job where jobname = 'delete-stale-anonymous-users'), 1,
  'timesjobben delete-stale-anonymous-users finnes');
select is((select schedule from cron.job where jobname = 'delete-stale-anonymous-users'), '35 * * * *',
  'jobben kjører hver time, minutt 35');

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select private.delete_stale_anonymous_users()$$, '42501', null,
  'innloggede kan ikke kjøre delete_stale_anonymous_users');
select tests.logout();

-- ===========================================================================
-- 2. Oppryddingen
-- ===========================================================================
select cmp_ok(private.delete_stale_anonymous_users(), '>=', 1, 'minst én bruker slettes');

select ok(not tests.user_exists('00000000-0000-0000-0000-00000000c001'), 'ukoblet og gammel: slettet');
select ok(tests.user_exists('00000000-0000-0000-0000-00000000c002'), 'ukoblet og ny: beholdt');
select ok(tests.user_exists('00000000-0000-0000-0000-00000000c003'), 'koblet barn: beholdt');
select is((select auth_user_id from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-00000000c003'::uuid, 'barnet er fortsatt koblet');
select ok(tests.user_exists('00000000-0000-0000-0000-00000000d001'), 'koblet skjerm: beholdt');
select is((select count(*)::int from public.household_displays
           where auth_user_id = '00000000-0000-0000-0000-00000000d001'), 1, 'skjermraden finnes');
select ok(tests.user_exists('00000000-0000-0000-0000-00000000e001'), 'e-postbruker uten kobling: beholdt');
select ok(tests.user_exists('00000000-0000-0000-0000-00000000a001'), 'voksen: beholdt');

-- Den nye blir slettet når den er over 24 timer gammel (p_now 24 timer fram).
select private.delete_stale_anonymous_users(now() + interval '24 hours');
select ok(not tests.user_exists('00000000-0000-0000-0000-00000000c002'), 'ukoblet og ny: slettet etter 24 timer');
select ok(tests.user_exists('00000000-0000-0000-0000-00000000c003')
          and tests.user_exists('00000000-0000-0000-0000-00000000d001')
          and tests.user_exists('00000000-0000-0000-0000-00000000e001'),
  'koblede og e-postbrukere røres heller ikke senere');

select * from finish();
rollback;
