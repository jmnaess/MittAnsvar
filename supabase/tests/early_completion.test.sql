-- Tester for avkrysning før fristen (sirkelen i «Kommende»). Se docs/DATABASE.md §3 (complete_task, punkt 8).
-- complete_task har ingen egen sjekk for dette. Testene låser at neste frist, angring, lønn og
-- barnets rettigheter blir som ellers. Datoene regnes fra i dag. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- ---------------------------------------------------------------------------
-- Testhjelpere (samme som i de andre testfilene)
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

create function tests.logout()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

-- Lest og skrevet som postgres (uten RLS). Titlene er unike i testen.
create function tests.tid(p_title text)
returns uuid language sql security definer as $$
  select id from public.tasks where title = p_title
$$;
create function tests.due(p_title text)
returns date language sql security definer as $$
  select next_due_on from public.tasks where title = p_title
$$;
-- Flytter fristen fram i tid: bare next_due_on endres, så triggeren regner ikke på nytt.
create function tests.set_due(p_title text, p_due date)
returns void language sql security definer as $$
  update public.tasks set next_due_on = p_due where title = p_title
$$;
-- Siste avkrysning på oppgaven.
create function tests.last_completion(p_title text)
returns public.task_completions language sql security definer as $$
  select * from public.task_completions where task_id = tests.tid(p_title)
  order by completed_at desc limit 1
$$;

grant execute on all functions in schema tests to anon, authenticated;

create table tests.d as
select private.local_today('Europe/Oslo') as today,
       extract(isodow from private.local_today('Europe/Oslo') + 2)::smallint as dow_plus_2,
       extract(isodow from private.local_today('Europe/Oslo') + 3)::smallint as dow_plus_3,
       extract(month from private.local_today('Europe/Oslo'))::smallint as month;
grant select on tests.d to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata: voksen, barn på egen enhet og et søsken uten enhet.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000a002', null);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Familien A', 'family', 'house', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox', null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A',   'owl', 2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Søsken',   'cat', 2018, null);

select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- Ukentlig på ukedagen om to dager: første frist er om to dager («Kommende», ikke «I dag»).
insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, weekdays)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Klipp plenen', 'calendar', 'week', 1, array[dow_plus_2] from tests.d;

insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rens sluket', 'interval', 'month', 3);

-- Sesong: denne og neste måned. Hver andre måned havner utenfor perioden.
insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every,
                          season_start_month, season_end_month)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sesongoppgave', 'interval', 'month', 2,
       month, month % 12 + 1 from tests.d;

-- Barnas oppgaver: ukentlig om tre dager, med lønn.
insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, weekdays,
                          assigned_member_id, reward_nok)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', t.title, 'calendar', 'week', 1, array[dow_plus_3], t.member, 10
from tests.d,
     (values ('Barnets oppgave',   'aaaaaaaa-0000-0000-0000-000000000002'::uuid),
             ('Barnets andre',     'aaaaaaaa-0000-0000-0000-000000000002'::uuid),
             ('Søskens oppgave',   'aaaaaaaa-0000-0000-0000-000000000003'::uuid)) as t(title, member);
select tests.logout();

select tests.set_due('Rens sluket',   (select today + 10 from tests.d));
select tests.set_due('Sesongoppgave', (select today + 10 from tests.d));

-- ===========================================================================
-- 1. Kalender: den planlagte forekomsten hoppes over
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select is(tests.due('Klipp plenen'), (select today + 2 from tests.d), 'fristen er om to dager');
select ok(not exists (select 1 from public.today_tasks where title = 'Klipp plenen'),
  'oppgaven står ikke i «I dag» ennå');

select is((select next_due_on from public.complete_task(tests.tid('Klipp plenen'),
          'aaaaaaaa-0000-0000-0000-000000000001')),
  (select today + 9 from tests.d), 'kalender, krysset av før fristen: neste frist er uken etter den planlagte');
select is(tests.due('Klipp plenen'), (select today + 9 from tests.d), 'den nye fristen er lagret');
select is((tests.last_completion('Klipp plenen')).completed_on, (select today from tests.d),
  'avkrysningen er gjort i dag');
select is((tests.last_completion('Klipp plenen')).due_on, (select today + 2 from tests.d),
  'avkrysningen husker den planlagte fristen');
select ok(exists (select 1 from public.today_completions where task_id = tests.tid('Klipp plenen')),
  'avkrysningen står som gjort i dag');

-- ===========================================================================
-- 2. Angre setter fristen tilbake
-- ===========================================================================
select lives_ok(format($$select public.undo_completion(%L)$$, (tests.last_completion('Klipp plenen')).id),
  'tidlig avkrysning kan angres');
select is(tests.due('Klipp plenen'), (select today + 2 from tests.d), 'fristen er tilbake på den planlagte datoen');
select ok(not exists (select 1 from public.today_completions where task_id = tests.tid('Klipp plenen')),
  'og avkrysningen er borte fra «I dag»');

-- ===========================================================================
-- 3. Intervall: regnes fra i dag
-- ===========================================================================
select is((select next_due_on from public.complete_task(tests.tid('Rens sluket'),
          'aaaaaaaa-0000-0000-0000-000000000001')),
  (select (today + interval '3 months')::date from tests.d),
  'intervall, krysset av før fristen: tre måneder fra i dag');
select is((tests.last_completion('Rens sluket')).due_on, (select today + 10 from tests.d),
  'avkrysningen husker den planlagte fristen');

-- ===========================================================================
-- 4. Sesong: neste frist utenfor perioden flyttes til periodens start
-- ===========================================================================
select is((select next_due_on from public.complete_task(tests.tid('Sesongoppgave'),
          'aaaaaaaa-0000-0000-0000-000000000001')),
  (select make_date(extract(year from today)::int + 1, month, 1) from tests.d),
  'sesong, krysset av før fristen: den 1. i periodens første måned neste år');
select lives_ok(format($$select public.undo_completion(%L)$$, (tests.last_completion('Sesongoppgave')).id),
  'sesongoppgaven kan angres');
select is(tests.due('Sesongoppgave'), (select today + 10 from tests.d), 'fristen er tilbake');
select tests.logout();

-- ===========================================================================
-- 5. Barn på egen enhet: bare egne oppgaver, lønn venter
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a002');

select results_eq(
  $$select next_due_on, reward_nok, status::text from public.complete_task(tests.tid('Barnets oppgave'),
    'aaaaaaaa-0000-0000-0000-000000000002')$$,
  $$select today + 10, 10, 'pending' from tests.d$$,
  'barnet krysser av egen oppgave før fristen: neste frist uken etter, lønnen venter');
select is((tests.last_completion('Barnets oppgave')).due_on, (select today + 3 from tests.d),
  'avkrysningen husker den planlagte fristen');

select throws_ok(format($$select public.complete_task(%L, 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  tests.tid('Søskens oppgave')), 'P0001', 'invalid_member', 'barnet kan ikke krysse av søskens kommende oppgave');
select throws_ok(format($$select public.complete_task(%L, 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  tests.tid('Søskens oppgave')), 'P0001', 'invalid_member', 'heller ikke på vegne av søskenet');
select is(tests.due('Søskens oppgave'), (select today + 3 from tests.d), 'søskens frist er uendret');

select lives_ok(format($$select public.undo_completion(%L)$$, (tests.last_completion('Barnets oppgave')).id),
  'barnet kan angre sin egen tidlige avkrysning');
select is(tests.due('Barnets oppgave'), (select today + 3 from tests.d), 'fristen er tilbake');
select tests.logout();

-- ===========================================================================
-- 6. Voksen krysser av barnets kommende oppgave: godkjent med én gang
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select results_eq(
  $$select next_due_on, reward_nok, status::text from public.complete_task(tests.tid('Barnets andre'),
    'aaaaaaaa-0000-0000-0000-000000000002')$$,
  $$select today + 10, 10, 'approved' from tests.d$$,
  'voksen krysser av for barnet før fristen: lønnen er godkjent');
select is(tests.due('Barnets andre'), (select today + 10 from tests.d), 'den nye fristen er lagret');
select tests.logout();

select * from finish();
rollback;
