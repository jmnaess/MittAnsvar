-- Tester for «Utsett til» (postpone_task, undo_postpone). Se docs/DATABASE.md §2 og §5.
-- Datoene regnes fra i dag, så testen virker uansett ukedag. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(59);

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
create function tests.task(p_title text)
returns public.tasks language sql security definer as $$
  select * from public.tasks where title = p_title
$$;
create function tests.due(p_title text)
returns date language sql security definer as $$
  select next_due_on from public.tasks where title = p_title
$$;
-- Gjør en oppgave forfalt: bare next_due_on endres, så triggeren regner ikke på nytt.
create function tests.set_due(p_title text, p_due date)
returns void language sql security definer as $$
  update public.tasks set next_due_on = p_due where title = p_title
$$;
create function tests.upcoming(p_title text, p_from date, p_to date)
returns date[] language sql as $$
  select coalesce(array_agg(o.due_on order by o.due_on), '{}')
  from public.get_upcoming_occurrences('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', p_from, p_to) o
  where o.task_id = tests.tid(p_title)
$$;

grant execute on all functions in schema tests to anon, authenticated;

create table tests.d as
select private.local_today('Europe/Oslo') as today,
       extract(isodow from private.local_today('Europe/Oslo'))::smallint as dow;
grant select on tests.d to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata: A (voksen og barn på egen enhet), B (voksen).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000a002', null),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com');

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Familien A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Familien B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox', null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A',   'owl', 2016, '00000000-0000-0000-0000-00000000a002'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat', null, '00000000-0000-0000-0000-00000000b001');

select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- Ukentlig på dagens ukedag: frist i dag, neste om 7 dager.
insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, weekdays)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ukentlig', 'calendar', 'week', 1, array[dow] from tests.d;
insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, weekdays)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ukentlig samme dag', 'calendar', 'week', 1, array[dow] from tests.d;
insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Daglig', 'calendar', 'day', 1),
       ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hver tredje dag', 'interval', 'day', 3);
insert into public.tasks (household_id, title, recurrence_type)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engangs', 'once'),
       ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ledig jobb', 'job');
insert into public.tasks (household_id, title, recurrence_type, once_on)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fram i tid', 'once', today + 3 from tests.d;
-- Månedsoppgave i denne måneden (frist den 1., i «Denne måneden»).
insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, month)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Månedsoppgave', 'calendar', 'year', 1,
       extract(month from today)::smallint from tests.d;
select tests.logout();

-- ===========================================================================
-- 1. Voksen utsetter en gjentakende oppgave
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select is(public.postpone_task(tests.tid('Ukentlig'), (select today + 2 from tests.d)),
  (select today from tests.d), 'voksen kan utsette, og får forrige frist tilbake');
select is(tests.due('Ukentlig'), (select today + 2 from tests.d), 'fristen er den nye datoen');
select is((tests.task('Ukentlig')).postponed_from, (select today from tests.d), 'postponed_from er forrige frist');
select ok(private.is_postponed(tests.task('Ukentlig')), 'oppgaven regnes som utsatt');
select ok(not exists (select 1 from public.today_tasks where title = 'Ukentlig'),
  'utsatt oppgave er borte fra «I dag»');

-- Gjentakelsen fortsetter etter det vanlige mønsteret.
select is((tests.task('Ukentlig')).weekdays, (select array[dow] from tests.d),
  'gjentakelsen er ikke endret');
select is(private.compute_next_due(tests.task('Ukentlig'), (select today + 2 from tests.d)),
  (select today + 7 from tests.d), 'gjort på den utsatte dagen: neste frist er vanlig ukedag');
select is(tests.upcoming('Ukentlig', (select today + 1 from tests.d), (select today + 15 from tests.d)),
  (select array[today + 2, today + 7, today + 14] from tests.d),
  'kommende forekomster: utsatt dato, så det vanlige mønsteret (årshjul og påminnelser)');

-- Intervall: regnes fra dagen den blir gjort, som før.
select lives_ok(format($$select public.postpone_task(%L, %L)$$,
  tests.tid('Hver tredje dag'), (select today + 5 from tests.d)), 'intervalloppgave kan utsettes');
select is(tests.upcoming('Hver tredje dag', (select today + 1 from tests.d), (select today + 9 from tests.d)),
  (select array[today + 5, today + 8] from tests.d), 'intervall: tre dager etter den utsatte datoen');

-- ===========================================================================
-- 2. Dobbel visning unngås
-- ===========================================================================
select lives_ok(format($$select public.postpone_task(%L, %L)$$,
  tests.tid('Ukentlig samme dag'), (select today + 7 from tests.d)),
  'utsett til en dag der oppgaven uansett skal gjøres');
select is(tests.upcoming('Ukentlig samme dag', (select today + 1 from tests.d), (select today + 15 from tests.d)),
  (select array[today + 7, today + 14] from tests.d), 'den dagen vises den bare én gang');
select is(private.compute_next_due(tests.task('Ukentlig samme dag'), (select today + 7 from tests.d)),
  (select today + 14 from tests.d), 'gjort den dagen: neste frist er uken etter');

-- Daglig til om tre dager: dagene imellom hoppes over (én åpen forekomst om gangen).
select lives_ok(format($$select public.postpone_task(%L, %L)$$,
  tests.tid('Daglig'), (select today + 3 from tests.d)), 'daglig oppgave kan utsettes');
select is(tests.upcoming('Daglig', (select today + 1 from tests.d), (select today + 4 from tests.d)),
  (select array[today + 3, today + 4] from tests.d), 'daglig: dagene før den nye datoen hoppes over');

-- ===========================================================================
-- 3. Glemt oppgave (frist passert). Daglige blir aldri forfalt, men står i «I dag».
-- ===========================================================================
select tests.logout();
select tests.set_due('Daglig', (select today - 3 from tests.d));
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select ok((select not is_overdue from public.today_tasks where title = 'Daglig'),
  'glemt daglig oppgave står i «I dag», uten forfalt');
select is(public.postpone_task(tests.tid('Daglig'), (select today + 1 from tests.d)),
  (select today - 3 from tests.d), 'glemt oppgave kan utsettes');
select ok(not exists (select 1 from public.today_tasks where title = 'Daglig'), 'og er borte fra «I dag»');

-- ===========================================================================
-- 4. Angre
-- ===========================================================================
select lives_ok(format($$select public.undo_postpone(%L)$$, tests.tid('Daglig')), 'voksen kan angre');
select is(tests.due('Daglig'), (select today - 3 from tests.d), 'fristen er tilbake');
select ok((select not is_overdue from public.today_tasks where title = 'Daglig'),
  'og oppgaven står i «I dag» igjen, uten forfalt');
select is((tests.task('Daglig')).postponed_to, null, 'utsettelsen er fjernet');
select throws_ok(format($$select public.undo_postpone(%L)$$, tests.tid('Daglig')),
  'P0001', 'undo_postpone_expired', 'kan ikke angre to ganger');

-- Krysset av etter utsettelse: kan ikke angres. Angres avkrysningen, er den utsatt igjen.
select lives_ok(format($$select public.complete_task(%L, 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  tests.tid('Ukentlig')), 'den utsatte oppgaven krysses av');
select is(tests.due('Ukentlig'), (select today + 7 from tests.d), 'neste frist er vanlig ukedag');
select ok(not private.is_postponed(tests.task('Ukentlig')), 'den er ikke lenger utsatt');
select throws_ok(format($$select public.undo_postpone(%L)$$, tests.tid('Ukentlig')),
  'P0001', 'undo_postpone_expired', 'utsettelsen kan ikke angres etter avkrysning');
select lives_ok(format($$select public.undo_completion(
  (select id from public.task_completions where task_id = %L))$$, tests.tid('Ukentlig')),
  'angre avkrysningen');
select ok(private.is_postponed(tests.task('Ukentlig')) and tests.due('Ukentlig') = (select today + 2 from tests.d),
  'etter angret avkrysning er den utsatt igjen');

-- ===========================================================================
-- 5. Engangsoppgaver og månedsoppgaver
-- ===========================================================================
select lives_ok(format($$select public.postpone_task(%L, %L)$$,
  tests.tid('Engangs'), (select today + 4 from tests.d)), 'engangsoppgave kan utsettes');
select is((tests.task('Engangs')).once_on::text || ' ' || tests.due('Engangs')::text,
  (select (today + 4)::text || ' ' || (today + 4)::text from tests.d), 'engangs: datoen er flyttet');

select tests.logout();
update public.tasks set next_due_on = (select today - 2 from tests.d), postponed_from = null, postponed_to = null
where title = 'Engangs';
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(format($$select public.postpone_task(%L, %L)$$,
  tests.tid('Engangs'), (select today + 1 from tests.d)), 'forfalt engangsoppgave kan utsettes');
select lives_ok(format($$select public.undo_postpone(%L)$$, tests.tid('Engangs')), 'og angres');
select ok((select is_overdue and next_due_on = today - 2 from public.today_tasks, tests.d where title = 'Engangs'),
  'engangs: forfalt igjen etter angring');

select lives_ok(format($$select public.postpone_task(%L, %L)$$,
  tests.tid('Månedsoppgave'), (select today + 1 from tests.d)), 'månedsoppgave kan utsettes');
select is(private.due_by(tests.task('Månedsoppgave')), (select today + 1 from tests.d),
  'utsatt månedsoppgave har den nye datoen som frist');

-- ===========================================================================
-- 6. Redigering nullstiller, og klienten kan ikke skrive kolonnene
-- ===========================================================================
select lives_ok(format($$update public.tasks set recurrence_every = 2 where id = %L$$, tests.tid('Hver tredje dag')),
  'endre gjentakelsen');
select is((tests.task('Hver tredje dag')).postponed_to, null, 'endret gjentakelse nullstiller utsettelsen');
select throws_ok(format($$update public.tasks set postponed_to = null, postponed_from = null where id = %L$$,
  tests.tid('Ukentlig')), '42501', null, 'klienten kan ikke skrive postponed_* direkte');

-- ===========================================================================
-- 7. Avvisninger
-- ===========================================================================
select throws_ok(format($$select public.postpone_task(%L, %L)$$, tests.tid('Ledig jobb'), (select today + 1 from tests.d)),
  'P0001', 'not_postponable', 'jobber kan ikke utsettes');
select throws_ok(format($$select public.postpone_task(%L, %L)$$, tests.tid('Ukentlig samme dag'), (select today from tests.d)),
  'P0001', 'invalid_date', 'kan ikke utsette til i dag, heller ikke en oppgave fram i tid');

-- ===========================================================================
-- 8. Nærmeste kommende forekomst («Kommende»)
-- ===========================================================================
select lives_ok(format($$select public.postpone_task(%L, %L)$$,
  tests.tid('Fram i tid'), (select today + 5 from tests.d)), 'kommende engangsoppgave kan utsettes');
select is((tests.task('Fram i tid')).once_on::text || ' ' || tests.due('Fram i tid')::text,
  (select (today + 5)::text || ' ' || (today + 5)::text from tests.d), 'kommende engangs: datoen er flyttet');
select throws_ok(format($$select public.postpone_task(%L, %L)$$, tests.tid('Fram i tid'), (select today + 5 from tests.d)),
  'P0001', 'invalid_date', 'kan ikke utsette til samme dag som fristen');
select throws_ok(format($$select public.postpone_task(%L, %L)$$, tests.tid('Fram i tid'), (select today + 4 from tests.d)),
  'P0001', 'invalid_date', 'kan ikke flytte en kommende oppgave til før fristen');
select lives_ok(format($$select public.undo_postpone(%L)$$, tests.tid('Fram i tid')), 'kommende utsettelse kan angres');
select is(tests.due('Fram i tid'), (select today + 3 from tests.d), 'angret: fristen er tilbake');

-- Allerede utsatt: kan utsettes igjen, og «Angre» går ett steg tilbake.
select is(public.postpone_task(tests.tid('Ukentlig samme dag'), (select today + 8 from tests.d)),
  (select today + 7 from tests.d), 'utsatt oppgave kan utsettes igjen');
select lives_ok(format($$select public.undo_postpone(%L)$$, tests.tid('Ukentlig samme dag')), 'andre utsettelse angres');
select is(tests.due('Ukentlig samme dag'), (select today + 7 from tests.d), 'angre går ett steg tilbake');

-- Gjentakende med frist i morgen: mønsteret fortsetter etter den nye datoen.
insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, weekdays)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'I morgen', 'calendar', 'week', 1, array[(dow % 7 + 1)::smallint] from tests.d;
select lives_ok(format($$select public.postpone_task(%L, %L)$$,
  tests.tid('I morgen'), (select today + 3 from tests.d)), 'kommende gjentakende oppgave kan utsettes');
select is(tests.upcoming('I morgen', (select today + 1 from tests.d), (select today + 9 from tests.d)),
  (select array[today + 3, today + 8] from tests.d), 'kommende: utsatt dato, så det vanlige mønsteret');
select lives_ok(format($$select public.undo_postpone(%L)$$, tests.tid('I morgen')), 'og angres');
select is(tests.due('I morgen'), (select today + 1 from tests.d), 'fristen er i morgen igjen');
select tests.logout();

-- Ny oppgave med frist i dag for dato- og tilgangssjekkene.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
insert into public.tasks (household_id, title, recurrence_type)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dato', 'once');
select throws_ok(format($$select public.postpone_task(%L, %L)$$, tests.tid('Dato'), (select today from tests.d)),
  'P0001', 'invalid_date', 'kan ikke utsette til i dag');
select throws_ok(format($$select public.postpone_task(%L, %L)$$, tests.tid('Dato'), (select today + 400 from tests.d)),
  'P0001', 'invalid_date', 'kan ikke utsette mer enn ett år');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(format($$select public.postpone_task(%L, %L)$$, tests.tid('Dato'), (select today + 1 from tests.d)),
  'P0001', 'not_adult', 'barn kan ikke utsette');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok(format($$select public.postpone_task(%L, %L)$$, tests.tid('Dato'), (select today + 1 from tests.d)),
  'P0001', 'not_adult', 'en voksen i en annen husstand kan ikke utsette');
select tests.logout();

update public.households set trial_ends_at = now() - interval '1 day'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok(format($$select public.postpone_task(%L, %L)$$, tests.tid('Dato'), (select today + 1 from tests.d)),
  'P0001', 'subscription_required', 'utløpt prøvetid avvises');
select tests.logout();

select * from finish();
rollback;
