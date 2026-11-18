-- Tester for viewet today_completions (utførte oppgaver i «I dag»).
-- Bare dagens avkrysninger i husstandens tidssone, ikke avviste, RLS gjelder,
-- og is_latest stemmer med regelen i undo_completion. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

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

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A1 (har enhet), barn A2. B: voksen B.
--   Oppgave 1: avkrysset i går og to ganger i dag (den siste er is_latest).
--   Oppgave 2: avkrysset i dag av A2, men avvist.
--   Oppgave 3: felles, avkrysset i dag av voksen A.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at, timezone) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house', now() + interval '14 days', 'Europe/Oslo'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'house', now() + interval '14 days', 'Europe/Oslo');

insert into public.members (id, household_id, role, display_name, avatar, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox', '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A1',  'owl', '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A2',  'frog', null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat', '00000000-0000-0000-0000-00000000b001');

insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type,
                          recurrence_unit, recurrence_every) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rydde rommet',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Støvsuge',
   'aaaaaaaa-0000-0000-0000-000000000003', 'interval', 'day', 1),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Søppel',
   null, 'interval', 'day', 1);

insert into public.task_completions
  (id, household_id, task_id, completed_by_member_id, completed_on, completed_at, status) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002', private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') - 1, now() - interval '1 day', 'approved'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002', private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), now() - interval '20 minutes', 'approved'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002', private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), now() - interval '2 minutes', 'pending'),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000003', private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), now() - interval '5 minutes', 'rejected'),
  ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001', private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), now() - interval '1 minute', 'approved');

-- ===========================================================================
-- Voksen A ser dagens, ikke gårsdagens og ikke den avviste
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select is((select count(*)::int from public.today_completions), 3,
  'voksen ser dagens tre avkrysninger');
select is((select count(*)::int from public.today_completions where id = 'cccccccc-0000-0000-0000-000000000001'), 0,
  'gårsdagens avkrysning er ikke med');
select is((select count(*)::int from public.today_completions where id = 'cccccccc-0000-0000-0000-000000000004'), 0,
  'avvist avkrysning er ikke med');
select is((select title from public.today_completions where id = 'cccccccc-0000-0000-0000-000000000005'), 'Søppel',
  'tittelen kommer fra oppgaven');

-- ===========================================================================
-- is_latest: bare den nyeste på oppgaven kan angres
-- ===========================================================================
select is((select is_latest from public.today_completions where id = 'cccccccc-0000-0000-0000-000000000002'), false,
  'eldre avkrysning på samme oppgave er ikke den siste');
select is((select is_latest from public.today_completions where id = 'cccccccc-0000-0000-0000-000000000003'), true,
  'nyeste avkrysning er den siste');

-- ===========================================================================
-- RLS: barnet ser bare egne, en annen husstand ser ingenting
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a002');
select is((select count(*)::int from public.today_completions), 2,
  'barnet ser bare egne avkrysninger');
select is((select count(*)::int from public.today_completions
           where completed_by_member_id <> 'aaaaaaaa-0000-0000-0000-000000000002'), 0,
  'barnet ser ingen andres');

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*)::int from public.today_completions), 0,
  'en annen husstand ser ingenting');

select tests.logout();
select * from finish();
rollback;
