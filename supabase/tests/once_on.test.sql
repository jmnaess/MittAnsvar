-- Tester for engangsoppgaver med valgfri dato (tasks.once_on). Se docs/DATABASE.md §1 og §2.
-- Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

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

create function tests.affected(stmt text)
returns int language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Lest som postgres (uten RLS). Titlene er unike i testen.
create function tests.tid(p_title text)
returns uuid language sql security definer as $$
  select id from public.tasks where title = p_title
$$;
create function tests.due(p_title text)
returns date language sql security definer as $$
  select next_due_on from public.tasks where title = p_title
$$;
create function tests.once_on(p_title text)
returns date language sql security definer as $$
  select once_on from public.tasks where title = p_title
$$;

grant execute on all functions in schema tests to anon, authenticated;

create table tests.d as select private.local_today('Europe/Oslo') as today;
grant select on tests.d to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata: A (voksen og barn), B (voksen).
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

-- ===========================================================================
-- 1. Opprette engangsoppgaver
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select lives_ok(
  $$insert into public.tasks (household_id, title, recurrence_type)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'I dag', 'once')$$,
  'engangsoppgave uten dato');
select is(tests.due('I dag'), (select today from tests.d),
  'uten dato: fristen er i dag (som før)');

select lives_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, once_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Om tre dager', 'once',
            (select today + 3 from tests.d))$$,
  'engangsoppgave med dato fram i tid');
select is(tests.due('Om tre dager'), (select today + 3 from tests.d),
  'med dato: fristen er datoen');

select lives_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, once_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'I forgårs', 'once',
            (select today - 2 from tests.d))$$,
  'engangsoppgave med dato bakover i tid');
select is(tests.due('I forgårs') || ' ' || tests.once_on('I forgårs'),
  (select today || ' ' || today from tests.d),
  'dato bakover i tid flyttes til i dag');

-- «I dag» viser bare det som forfaller i dag.
select ok(exists (select 1 from public.today_tasks where title = 'I dag'),
  'oppgaven for i dag vises i «I dag»');
select ok(not exists (select 1 from public.today_tasks where title = 'Om tre dager'),
  'oppgaven om tre dager vises ikke i «I dag» ennå');

select throws_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, once_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Intervall med dato', 'interval', 'day', 7,
            (select today + 1 from tests.d))$$,
  '23514', null, 'once_on kan bare brukes på engangsoppgaver');

-- ===========================================================================
-- 2. Endre
-- ===========================================================================
select is(tests.affected(format($$update public.tasks set once_on = %L where id = %L$$,
  (select today + 1 from tests.d), tests.tid('Om tre dager'))), 1, 'voksen A kan endre datoen');
select is(tests.due('Om tre dager'), (select today + 1 from tests.d), 'ny dato gir ny frist');

select is(tests.affected(format($$update public.tasks set title = 'Om tre dager', once_on = %L where id = %L$$,
  (select today + 1 from tests.d), tests.tid('Om tre dager'))), 1, 'lagre igjen uten å endre datoen');
select is(tests.due('Om tre dager'), (select today + 1 from tests.d), 'samme dato: fristen står');

-- En utført engangsoppgave åpnes ikke igjen av at tittelen endres.
select is((select r.next_due_on from public.complete_task(tests.tid('I dag'), 'aaaaaaaa-0000-0000-0000-000000000001') r),
  null, 'utført engangsoppgave har ingen neste frist');
select lives_ok(format($$update public.tasks set title = 'I dag', once_on = null where id = %L$$, tests.tid('I dag')),
  'lagre den utførte oppgaven uten endret dato');
select is(tests.due('I dag'), null, 'den utførte oppgaven er fortsatt ferdig');

select lives_ok(format($$update public.tasks set once_on = %L where id = %L$$,
  (select today + 2 from tests.d), tests.tid('I dag')), 'gi den utførte oppgaven en ny dato');
select is(tests.due('I dag'), (select today + 2 from tests.d), 'ny dato åpner oppgaven igjen');

-- Fra engangsoppgave til gjentakende: datoen må fjernes.
select throws_ok(format($$update public.tasks set recurrence_type = 'interval', recurrence_unit = 'day',
  recurrence_every = 7 where id = %L$$, tests.tid('Om tre dager')),
  '23514', null, 'gjentakende oppgave kan ikke beholde once_on');
select lives_ok(format($$update public.tasks set recurrence_type = 'interval', recurrence_unit = 'day',
  recurrence_every = 7, once_on = null where id = %L$$, tests.tid('Om tre dager')),
  'gjentakende oppgave uten once_on går');
select tests.logout();

-- ===========================================================================
-- 3. Hvem kan
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, once_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Barnets', 'once', (select today + 1 from tests.d))$$,
  '42501', null, 'barn kan ikke opprette oppgaver');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select is(tests.affected(format($$update public.tasks set once_on = %L where id = %L$$,
  (select today + 5 from tests.d), tests.tid('I forgårs'))), 0,
  'en voksen i en annen husstand kan ikke endre datoen');
select tests.logout();

select * from finish();
rollback;
