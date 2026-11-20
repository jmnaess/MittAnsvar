-- Tester for familieskjermen: personvisningen (nye nøkler i get_family_board) og
-- «Koble fra denne skjermen» (unlink_this_display). Se docs/DATABASE.md §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

-- ---------------------------------------------------------------------------
-- Testhjelpere
-- ---------------------------------------------------------------------------
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

create function tests.login_as_anonymous(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', true)::text, true);
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

-- Tavla lagres én gang, så testene under leser det skjermen faktisk fikk.
create table tests.board (b jsonb);
grant all on tests.board to authenticated;

-- Alle nøkler som finnes i objektene i en liste på tavla.
create function tests.keys_in(p_list text)
returns text[] language sql as $$
  select coalesce(array_agg(distinct k order by k), '{}')
  from tests.board, jsonb_array_elements(b -> p_list) e, jsonb_object_keys(e) k;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A1, barn K (har enhet a003) og L. B: voksen B1, barn M.
--   d001 og d002 = skjermer i A, d003 = skjerm i B, d004 = ukoblet anonym enhet.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'a1@example.com', false),
  ('00000000-0000-0000-0000-00000000a003', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'b1@example.com', false),
  ('00000000-0000-0000-0000-00000000d001', null, true),
  ('00000000-0000-0000-0000-00000000d002', null, true),
  ('00000000-0000-0000-0000-00000000d003', null, true),
  ('00000000-0000-0000-0000-00000000d004', null, true);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hjem A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hjem B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'A1', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'K',  'owl',  2016, '00000000-0000-0000-0000-00000000a003'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'L',  'frog', 2014, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'B1', 'bear', null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'M',  'bear', 2015, null);

insert into public.household_displays (household_id, auth_user_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-00000000d001'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-00000000d002'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-00000000d003');

-- Oppgaver. Tittelen sier hva de er. Alle har frist i dag (første forekomst).
insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type, recurrence_unit,
                          recurrence_every, reward_nok, description) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'K ukentlig',  'aaaaaaaa-0000-0000-0000-000000000003', 'interval', 'week', 1, 20, 'hemmelig beskrivelse'),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'L daglig',    'aaaaaaaa-0000-0000-0000-000000000004', 'interval', 'day',  1, null, null),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Felles uke',  null,                                   'interval', 'week', 1, null, null),
  ('aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'K arkivert',  'aaaaaaaa-0000-0000-0000-000000000003', 'interval', 'week', 1, null, null),
  ('bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'M ukentlig',  'bbbbbbbb-0000-0000-0000-000000000002', 'interval', 'week', 1, null, null);

insert into public.tasks (id, household_id, title, recurrence_type, job_repeats, job_member_ids, reward_nok) values
  ('aaaaaaaa-1111-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jobb', 'job', true, '{}'::uuid[], 10);

update public.tasks set archived_at = now() where id = 'aaaaaaaa-1111-0000-0000-000000000004';

-- En mal med kilde, og «K ukentlig» laget fra den.
insert into public.task_templates (id, slug, title, description, category, recurrence_type,
                                   recurrence_unit, recurrence_every, source_name, source_url) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'test-kilde', 'Testmal', 'hemmelig beskrivelse', 'maintenance',
   'interval', 'week', 1, 'DSB', 'https://www.dsb.no');
update public.tasks set template_id = 'eeeeeeee-0000-0000-0000-000000000001'
where id = 'aaaaaaaa-1111-0000-0000-000000000001';

-- Avkrysninger: i går (godkjent), for to dager siden (avvist), for tre dager siden (venter),
-- for fire dager siden og i dag. I B: i går.
insert into public.task_completions
  (id, household_id, task_id, completed_by_member_id, completed_on, completed_at, status, reward_nok) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000003', tests.day(-1), now() - interval '1 day', 'approved', 20),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000003', tests.day(-2), now() - interval '2 days', 'rejected', 20),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000003', tests.day(-3), now() - interval '3 days', 'pending', 20),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000004', tests.day(-4), now() - interval '4 days', 'approved', null),
  ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000004', tests.day(0), now(), 'approved', null),
  ('cccccccc-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-1111-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000002', tests.day(-1), now() - interval '1 day', 'approved', null);

-- ===========================================================================
-- 1. Personvisningen i get_family_board
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
insert into tests.board select public.get_family_board();
select tests.logout();

select ok((select b is not null from tests.board), 'skjermen får tavla');

select is(
  (select array(select jsonb_object_keys(b) order by 1) from tests.board),
  array['completions', 'household_id', 'household_name', 'members', 'occurrences', 'recent',
        'tasks', 'today', 'upcoming_tasks'],
  'tavla har bare de kjente nøklene (ingen saldo eller utbetalinger)');

-- upcoming_tasks
select is(
  (select array(select e ->> 'title' from tests.board, jsonb_array_elements(b -> 'upcoming_tasks') e order by 1)),
  array['K ukentlig', 'L daglig'],
  'upcoming_tasks: bare egne oppgaver med ansvarlig, ikke felles, jobber, arkiverte eller andre husstander');
select ok(
  (select bool_and(e ->> 'household_id' = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
   from tests.board, jsonb_array_elements(b -> 'upcoming_tasks') e),
  'upcoming_tasks: alle fra egen husstand');
select ok(
  not (tests.keys_in('upcoming_tasks') && array['created_by', 'category', 'anchor_on',
                                                 'archived_at', 'auth_user_id', 'template_id']),
  'upcoming_tasks: ingen interne felt');
select is(
  (select e ->> 'description' from tests.board, jsonb_array_elements(b -> 'upcoming_tasks') e
   where e ->> 'title' = 'K ukentlig'),
  'hemmelig beskrivelse', 'upcoming_tasks: beskrivelsen er med («Slik gjør du»)');
select is(
  (select e -> 'template' from tests.board, jsonb_array_elements(b -> 'upcoming_tasks') e
   where e ->> 'title' = 'K ukentlig'),
  jsonb_build_object('description', 'hemmelig beskrivelse', 'source_name', 'DSB',
                     'source_url', 'https://www.dsb.no', 'recurrence_type', 'interval',
                     'recurrence_unit', 'week', 'season_start_month', null),
  'upcoming_tasks: malen med kilde og gjentakelse');
select is(
  (select e -> 'template' from tests.board, jsonb_array_elements(b -> 'upcoming_tasks') e
   where e ->> 'title' = 'L daglig'),
  'null'::jsonb, 'upcoming_tasks: template er null uten mal');
select is(
  (select e -> 'template' ->> 'source_name' from tests.board, jsonb_array_elements(b -> 'tasks') e
   where e ->> 'title' = 'K ukentlig'),
  'DSB', 'tasks: malen er med');
select throws_ok(
  $$insert into public.task_templates (slug, title, description, category, recurrence_type,
                                       recurrence_unit, recurrence_every, source_url)
    values ('test-uten-navn', 'X', 'X', 'other', 'interval', 'week', 1, 'https://example.com')$$,
  '23514', null, 'source_url krever source_name');
select ok(
  (select (e ->> 'reward_nok')::int = 20 from tests.board, jsonb_array_elements(b -> 'upcoming_tasks') e
   where e ->> 'title' = 'K ukentlig'),
  'upcoming_tasks: beløpet per oppgave er med');

-- occurrences
select ok(
  (select bool_and((e ->> 'task_id')::uuid in ('aaaaaaaa-1111-0000-0000-000000000001',
                                                'aaaaaaaa-1111-0000-0000-000000000002'))
   from tests.board, jsonb_array_elements(b -> 'occurrences') e),
  'occurrences: bare for oppgavene i upcoming_tasks');
select ok(
  (select min((e ->> 'due_on')::date) >= tests.day(1) and max((e ->> 'due_on')::date) <= tests.day(14)
   from tests.board, jsonb_array_elements(b -> 'occurrences') e),
  'occurrences: fra i morgen til og med 14 dager fram');
select is(
  (select count(*)::int from tests.board, jsonb_array_elements(b -> 'occurrences') e
   where e ->> 'task_id' = 'aaaaaaaa-1111-0000-0000-000000000001'),
  2, 'occurrences: ukentlig oppgave kommer to ganger på 14 dager');
select is(
  (select count(*)::int from tests.board, jsonb_array_elements(b -> 'occurrences') e
   where e ->> 'task_id' = 'aaaaaaaa-1111-0000-0000-000000000002'),
  14, 'occurrences: daglig oppgave er med (klienten skjuler hyppige)');

-- recent
select is(
  (select array(select e ->> 'id' from tests.board, jsonb_array_elements(b -> 'recent') e order by 1)),
  array['cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003'],
  'recent: i går til tre dager siden, uten avviste, dagens, eldre eller andre husstander');
select is(
  (select e ->> 'status' from tests.board, jsonb_array_elements(b -> 'recent') e
   where e ->> 'id' = 'cccccccc-0000-0000-0000-000000000003'),
  'pending', 'recent: ventende er med');
select is(
  tests.keys_in('recent'),
  array['completed_at', 'completed_by_member_id', 'completed_on', 'household_id', 'id',
        'recurrence_type', 'reward_nok', 'status', 'task_id', 'title'],
  'recent: bare visningsfeltene, ikke recorded_by');

-- members (uendret, men sjekkes igjen siden funksjonen er skrevet om)
select ok(
  not (tests.keys_in('members') && array['birth_year', 'auth_user_id']),
  'members: ikke fødselsår eller bruker-id');

-- Andre enn skjermer får ingenting.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is(public.get_family_board(), null, 'en voksen får ikke tavla');
select tests.logout();
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a003');
select is(public.get_family_board(), null, 'barnets enhet får ikke tavla');
select tests.logout();

-- Skjermen i B ser bare B.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d003');
select is(
  (select array(select e ->> 'id' from jsonb_array_elements(public.get_family_board() -> 'recent') e)),
  array['cccccccc-0000-0000-0000-000000000006'],
  'skjermen i B ser bare avkrysninger i B');
select tests.logout();

-- ===========================================================================
-- 2. unlink_this_display
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok('select public.unlink_this_display()', 'P0001', 'not_display',
  'en voksen kan ikke bruke unlink_this_display');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a003');
select throws_ok('select public.unlink_this_display()', 'P0001', 'not_display',
  'barnets enhet kan ikke bruke unlink_this_display');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d004');
select throws_ok('select public.unlink_this_display()', 'P0001', 'not_display',
  'en ukoblet enhet kan ikke bruke unlink_this_display');
select tests.logout();

select is((select count(*)::int from public.household_displays), 3, 'ingen skjermer er koblet fra ennå');
select ok(exists (select 1 from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000003'
                  and auth_user_id is not null), 'barnets enhet er fortsatt koblet');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select lives_ok('select public.unlink_this_display()', 'skjermen kan koble fra seg selv');
select tests.logout();

select ok(not exists (select 1 from public.household_displays
                      where auth_user_id = '00000000-0000-0000-0000-00000000d001'),
  'skjermens kobling er slettet');
select ok(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000d001'),
  'skjermens anonyme bruker er slettet');
select is(
  (select array(select auth_user_id::text from public.household_displays order by 1)),
  array['00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000d003'],
  'de andre skjermene (også i samme husstand) er fortsatt koblet');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select throws_ok('select public.unlink_this_display()', 'P0001', 'not_display',
  'en frakoblet skjerm kan ikke koble fra igjen');
select tests.logout();

select * from finish();
rollback;
