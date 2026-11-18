-- Tester for viewet recent_completions («Gjort siste 3 dager» i personvisningen).
-- Bare i går til tre dager siden i husstandens tidssone, ikke avviste, arkiverte oppgaver er med,
-- og RLS gjelder: barn ser bare egen historikk. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

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

create function tests.day(p_offset int)
returns date language sql as $$
  select private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + p_offset;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A1 (har enhet), barn A2. B: voksen B.
--   Barn A1: i dag, i går, for 3 dager siden, for 4 dager siden, og en avvist i går.
--   Barn A2: i går. Voksen A: i går. Engangsjobb (arkivert): A1 for 2 dager siden.
--   B: i går.
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
   null, 'interval', 'day', 1),
  ('bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Oppvask',
   null, 'interval', 'day', 1);

insert into public.tasks (id, household_id, title, recurrence_type, reward_nok) values
  ('aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vaske bilen',
   'job', 50);
update public.tasks set archived_at = now() where id = 'aaaaaaaa-1111-0000-0000-000000000004';

insert into public.task_completions
  (id, household_id, task_id, completed_by_member_id, completed_on, completed_at, status, reward_nok) values
  -- Barn A1
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002', tests.day(0), now(), 'approved', null),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002', tests.day(-1), now() - interval '1 day', 'approved', null),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002', tests.day(-3), now() - interval '3 days', 'approved', null),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002', tests.day(-4), now() - interval '4 days', 'approved', null),
  ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000002', tests.day(-1), now() - interval '1 day', 'rejected', null),
  ('cccccccc-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000002', tests.day(-2), now() - interval '2 days', 'approved', 50),
  -- Barn A2 og voksen A
  ('cccccccc-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000003', tests.day(-1), now() - interval '1 day', 'approved', null),
  ('cccccccc-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001', tests.day(-1), now() - interval '1 day', 'approved', null),
  -- Husstand B
  ('cccccccc-0000-0000-0000-000000000009', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-1111-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001', tests.day(-1), now() - interval '1 day', 'approved', null);

-- ===========================================================================
-- Voksen A: hele husstanden, bare i går til 3 dager siden, ikke avviste
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select set_eq(
  'select id from public.recent_completions',
  $$ values ('cccccccc-0000-0000-0000-000000000002'::uuid), ('cccccccc-0000-0000-0000-000000000003'),
            ('cccccccc-0000-0000-0000-000000000006'), ('cccccccc-0000-0000-0000-000000000007'),
            ('cccccccc-0000-0000-0000-000000000008') $$,
  'voksen ser husstandens avkrysninger fra i går til for 3 dager siden');
select is((select count(*)::int from public.recent_completions where id = 'cccccccc-0000-0000-0000-000000000001'), 0,
  'dagens avkrysning er ikke med');
select is((select count(*)::int from public.recent_completions where id = 'cccccccc-0000-0000-0000-000000000004'), 0,
  'avkrysning for 4 dager siden er ikke med');
select is((select count(*)::int from public.recent_completions where id = 'cccccccc-0000-0000-0000-000000000005'), 0,
  'avvist avkrysning er ikke med');
select is((select title from public.recent_completions where id = 'cccccccc-0000-0000-0000-000000000006'), 'Vaske bilen',
  'arkivert oppgave (gjort engangsjobb) er med, med tittel');
select is((select reward_nok from public.recent_completions where id = 'cccccccc-0000-0000-0000-000000000006'), 50,
  'beløpet kommer fra avkrysningen');

-- ===========================================================================
-- RLS: barnet ser bare egen historikk
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a002');
select set_eq(
  'select id from public.recent_completions',
  $$ values ('cccccccc-0000-0000-0000-000000000002'::uuid), ('cccccccc-0000-0000-0000-000000000003'),
            ('cccccccc-0000-0000-0000-000000000006') $$,
  'barnet ser bare egne avkrysninger');
select is((select count(*)::int from public.recent_completions
           where completed_by_member_id = 'aaaaaaaa-0000-0000-0000-000000000003'), 0,
  'barnet ser ikke søskens historikk');
select is((select count(*)::int from public.recent_completions
           where completed_by_member_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0,
  'barnet ser ikke de voksnes historikk');

-- ===========================================================================
-- Andre husstander og anon
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000b001');
select set_eq('select id from public.recent_completions',
  $$ values ('cccccccc-0000-0000-0000-000000000009'::uuid) $$,
  'en annen husstand ser bare sine egne');

select tests.logout();
set local role anon;
select throws_ok('select * from public.recent_completions', '42501', null,
  'anon har ingen tilgang');
reset role;

select * from finish();
rollback;
