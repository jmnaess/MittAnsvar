-- Tester for familieskjermen: felles årshjul-oppgaver i get_family_board (upcoming_tasks og
-- occurrences). Se migrasjonene 20261203090000_board_shared_year_tasks.sql og
-- 20261204090000_board_year_rule_calendar.sql. Alt rulles tilbake.
--
-- «Bare for voksne, aldri barn» kan ikke testes her: tavla er én for hele skjermen, og klienten
-- velger person. Det testes i src/features/display/__tests__/personView.test.ts.
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- ---------------------------------------------------------------------------
-- Testhjelpere
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated;

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

-- Tavla for hver skjerm lagres én gang, så testene under leser det skjermen faktisk fikk.
create table tests.board (household text, b jsonb);
grant all on tests.board to authenticated;

create function tests.titles(p_household text, p_list text)
returns text[] language sql as $$
  select coalesce(array_agg(e ->> 'title' order by e ->> 'title'), '{}')
  from tests.board, jsonb_array_elements(b -> p_list) e
  where household = p_household;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Paritet med taskSection(t) = 'year' i src/features/tasks/section.ts.
-- Samme liste leses av src/features/tasks/__tests__/section.test.ts (mellom de to parity-merkene),
-- så de to reglene ikke kan skille lag uten at en test feiler. Endre bare JSON-en mellom merkene.
-- year_wheel = forventet svar: true = Årshjul, false = Hverdag.
-- ---------------------------------------------------------------------------
create table tests.parity as
select * from jsonb_to_recordset($parity$
[
  {"title": "Felles årlig",            "recurrence_type": "calendar", "recurrence_unit": "year",  "recurrence_every": 1,  "weekdays": null, "month": 3,    "month_day": 15,   "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Felles sesong",           "recurrence_type": "calendar", "recurrence_unit": "week",  "recurrence_every": 1,  "weekdays": [6],  "month": null, "month_day": null, "season_start_month": 4,    "season_end_month": 9,    "year_wheel": true},
  {"title": "Sesong intervall 7 dager", "recurrence_type": "interval", "recurrence_unit": "day",   "recurrence_every": 7,  "weekdays": null, "month": null, "month_day": null, "season_start_month": 5,    "season_end_month": 9,    "year_wheel": true},
  {"title": "Kalender hver 3. måned",  "recurrence_type": "calendar", "recurrence_unit": "month", "recurrence_every": 3,  "weekdays": null, "month": null, "month_day": 1,    "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Kalender hver 2. måned",  "recurrence_type": "calendar", "recurrence_unit": "month", "recurrence_every": 2,  "weekdays": null, "month": null, "month_day": 1,    "season_start_month": null, "season_end_month": null, "year_wheel": false},
  {"title": "Kalender hver 13. uke",   "recurrence_type": "calendar", "recurrence_unit": "week",  "recurrence_every": 13, "weekdays": [6],  "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Kalender hver 12. uke",   "recurrence_type": "calendar", "recurrence_unit": "week",  "recurrence_every": 12, "weekdays": [6],  "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": false},
  {"title": "Kalender hver 90. dag",   "recurrence_type": "calendar", "recurrence_unit": "day",   "recurrence_every": 90, "weekdays": null, "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Intervall 6 mnd",         "recurrence_type": "interval", "recurrence_unit": "month", "recurrence_every": 6,  "weekdays": null, "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Intervall 3 mnd",         "recurrence_type": "interval", "recurrence_unit": "month", "recurrence_every": 3,  "weekdays": null, "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Intervall 1 år",          "recurrence_type": "interval", "recurrence_unit": "year",  "recurrence_every": 1,  "weekdays": null, "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Intervall 13 uker",       "recurrence_type": "interval", "recurrence_unit": "week",  "recurrence_every": 13, "weekdays": null, "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Intervall 12 uker",       "recurrence_type": "interval", "recurrence_unit": "week",  "recurrence_every": 12, "weekdays": null, "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": false},
  {"title": "Intervall 90 dager",      "recurrence_type": "interval", "recurrence_unit": "day",   "recurrence_every": 90, "weekdays": null, "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Intervall 89 dager",      "recurrence_type": "interval", "recurrence_unit": "day",   "recurrence_every": 89, "weekdays": null, "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": false},
  {"title": "Månedsoppgave",           "recurrence_type": "calendar", "recurrence_unit": "year",  "recurrence_every": 1,  "weekdays": null, "month": 5,    "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": true},
  {"title": "Ukentlig",                "recurrence_type": "calendar", "recurrence_unit": "week",  "recurrence_every": 1,  "weekdays": [6],  "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": false},
  {"title": "Hver 2. måned",           "recurrence_type": "interval", "recurrence_unit": "month", "recurrence_every": 2,  "weekdays": null, "month": null, "month_day": null, "season_start_month": null, "season_end_month": null, "year_wheel": false}
]
$parity$::jsonb) as x(
  title text, recurrence_type public.recurrence_type, recurrence_unit public.recurrence_unit,
  recurrence_every smallint, weekdays smallint[], month smallint, month_day smallint,
  season_start_month smallint, season_end_month smallint, year_wheel boolean
);

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A1, barn K, skjerm d001. B: voksen B1, skjerm d003.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'a1@example.com', false),
  ('00000000-0000-0000-0000-00000000b001', 'b1@example.com', false),
  ('00000000-0000-0000-0000-00000000d001', null, true),
  ('00000000-0000-0000-0000-00000000d003', null, true);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hjem A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hjem B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'A1', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'K',  'owl',  2016, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'B1', 'bear', null, '00000000-0000-0000-0000-00000000b001');

insert into public.household_displays (household_id, auth_user_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-00000000d001'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-00000000d003');

-- Alle paritetstilfellene som felles oppgaver i A.
insert into public.tasks (household_id, title, assigned_member_id, recurrence_type, recurrence_unit,
                          recurrence_every, weekdays, month, month_day, season_start_month, season_end_month)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', p.title, null, p.recurrence_type, p.recurrence_unit,
       p.recurrence_every, p.weekdays, p.month, p.month_day, p.season_start_month, p.season_end_month
from tests.parity p;

-- Felles årlig om 5 dager (for occurrences), barnets ukentlige, en arkivert felles årlig og
-- en felles årlig i B.
insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type, recurrence_unit,
                          recurrence_every, month, month_day) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Felles årlig snart', null,
   'calendar', 'year', 1,
   extract(month from private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 5)::smallint,
   extract(day   from private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 5)::smallint),
  ('aaaaaaaa-2222-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Felles årlig arkivert', null,
   'calendar', 'year', 1, 6, 1),
  ('bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B felles årlig', null,
   'calendar', 'year', 1, 6, 1);

insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type, recurrence_unit,
                          recurrence_every) values
  ('aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'K ukentlig',
   'aaaaaaaa-0000-0000-0000-000000000003', 'interval', 'week', 1);

update public.tasks set archived_at = now() where id = 'aaaaaaaa-2222-0000-0000-000000000003';

-- Tavlene, lest som skjermene.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
insert into tests.board select 'A', public.get_family_board();
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d003');
insert into tests.board select 'B', public.get_family_board();
select tests.logout();

-- ===========================================================================
-- 1. Paritet: felles oppgaver i upcoming_tasks = tilfellene med year_wheel = true
-- ===========================================================================
select ok((select count(*) = 18 from tests.parity), 'paritetslisten har 18 tilfeller');

select ok(
  (select bool_and(next_due_on is not null) from public.tasks
   where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and title in (select title from tests.parity)),
  'alle paritetstilfellene har frist (ellers ville de falt ut av en annen grunn)');

select is(
  (select coalesce(array_agg(t order by t), '{}') from unnest(tests.titles('A', 'upcoming_tasks')) t
   where t in (select title from tests.parity)),
  (select array_agg(title order by title) from tests.parity where year_wheel),
  'upcoming_tasks: felles oppgaver er med nøyaktig når taskSection = ''year''');

-- ===========================================================================
-- 2. Resten av upcoming_tasks
-- ===========================================================================
select ok('K ukentlig' = any(tests.titles('A', 'upcoming_tasks')),
  'upcoming_tasks: oppgaver med ansvarlig er fortsatt med');
select ok(not ('Felles årlig arkivert' = any(tests.titles('A', 'upcoming_tasks'))),
  'upcoming_tasks: arkiverte felles årshjul-oppgaver er ikke med');
select ok(
  (select bool_and(e -> 'assigned_member_id' = 'null'::jsonb)
   from tests.board, jsonb_array_elements(b -> 'upcoming_tasks') e
   where household = 'A' and e ->> 'title' like 'Felles%'),
  'upcoming_tasks: felles oppgaver har assigned_member_id null (klienten viser dem bare for voksne)');

select is(
  (select array_agg(distinct k order by k)
   from tests.board, jsonb_array_elements(b -> 'upcoming_tasks') e, jsonb_object_keys(e) k),
  array['assigned_member_id', 'description', 'household_id', 'id', 'job_member_ids', 'job_repeats',
        'month', 'month_day', 'next_due_on', 'postponed_to', 'recurrence_every', 'recurrence_type',
        'recurrence_unit', 'reward_nok', 'season_end_month', 'season_start_month', 'template',
        'title', 'weekdays'],
  'upcoming_tasks: nøyaktig de samme feltene som før (ingen nye)');

select is(
  (select array(select jsonb_object_keys(b) order by 1) from tests.board where household = 'A'),
  array['completions', 'household_id', 'household_name', 'members', 'occurrences', 'recent',
        'tasks', 'today', 'upcoming_tasks'],
  'tavla har de samme nøklene som før (ingen saldo, utbetalinger eller hjemprofil)');

-- ===========================================================================
-- 3. occurrences
-- ===========================================================================
select ok(
  (select bool_or(e ->> 'task_id' = 'aaaaaaaa-2222-0000-0000-000000000001'
                  and (e ->> 'due_on')::date = private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 5)
   from tests.board, jsonb_array_elements(b -> 'occurrences') e where household = 'A'),
  'occurrences: felles årlig oppgave om 5 dager er med');

select ok(
  (select bool_and((e ->> 'task_id')::uuid in (
     select (u ->> 'id')::uuid from tests.board tb, jsonb_array_elements(tb.b -> 'upcoming_tasks') u
     where tb.household = 'A'))
   from tests.board, jsonb_array_elements(b -> 'occurrences') e where household = 'A'),
  'occurrences: bare for oppgavene i upcoming_tasks (ingen «Ukentlig» eller andre felles hverdag)');

-- ===========================================================================
-- 4. Andre husstander
-- ===========================================================================
select is(tests.titles('B', 'upcoming_tasks'), array['B felles årlig'],
  'B-skjermen ser bare sin egen felles årshjul-oppgave, ingenting fra A');

select * from finish();
rollback;
