-- Tester for get_upcoming_occurrences (steg 8). Se docs/DATABASE.md §2. Alt rulles tilbake.
--
-- Fristene settes med faste datoer som superbruker etter insert. Da virker testene uansett hvilken
-- dag de kjøres. Triggeren endrer bare fristen når gjentakelsen endres, så oppdateringen blir stående.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

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

-- Forekomstene for én oppgave (etter tittel) i et vindu, sortert.
create function tests.occ(hid uuid, title text, p_from date, p_to date)
returns date[] language sql as $$
  select coalesce(array_agg(u.due_on order by u.due_on), '{}')
  from public.get_upcoming_occurrences(hid, p_from, p_to) u
  join public.tasks t on t.id = u.task_id
  where t.title = occ.title;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata. 2026-11-17 er en tirsdag, 2026-11-22 en søndag.
--   A: voksen A med oppgaver. B: voksen B med én oppgave.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com');

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'couple', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'couple', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox', '00000000-0000-0000-0000-00000000a001'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat', '00000000-0000-0000-0000-00000000b001');

insert into public.tasks
  (household_id, title, recurrence_type, recurrence_unit, recurrence_every, weekdays, month_day, month) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Søppel',        'calendar', 'week',  1, '{7}', null, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Forfalt søppel','calendar', 'week',  1, '{7}', null, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hver 3. dag',   'calendar', 'day',   3, null,  null, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Takrenner',     'calendar', 'year',  1, null,  null, 12),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rense sluk',    'interval', 'day',   3, null,  null, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engang',        'once',     null, null, null,  null, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engang utført', 'once',     null, null, null,  null, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Arkivert',      'calendar', 'week',  1, '{7}', null, null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B sin',         'once',     null, null, null,  null, null);

update public.tasks set anchor_on = '2026-11-16', next_due_on = '2026-11-22' where title = 'Søppel';
update public.tasks set anchor_on = '2026-11-02', next_due_on = '2026-11-08' where title = 'Forfalt søppel';
update public.tasks set anchor_on = '2026-12-27', next_due_on = '2026-12-30' where title = 'Hver 3. dag';
update public.tasks set anchor_on = '2026-11-17', next_due_on = '2026-12-01' where title = 'Takrenner';
update public.tasks set anchor_on = '2026-11-15', next_due_on = '2026-11-18' where title = 'Rense sluk';
update public.tasks set anchor_on = '2026-11-19', next_due_on = '2026-11-19' where title = 'Engang';
update public.tasks set anchor_on = '2026-11-10', next_due_on = null         where title = 'Engang utført';
update public.tasks set anchor_on = '2026-11-16', next_due_on = '2026-11-22', archived_at = now()
  where title = 'Arkivert';
update public.tasks set anchor_on = '2026-11-18', next_due_on = '2026-11-18' where title = 'B sin';

select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- ---------------------------------------------------------------------------
-- Forekomster
-- ---------------------------------------------------------------------------
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Søppel', '2026-11-17', '2026-11-23'),
  '{2026-11-22}'::date[], 'ukentlig: én søndag i et 7-dagersvindu');
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Søppel', '2026-11-17', '2026-11-30'),
  '{2026-11-22,2026-11-29}'::date[], 'ukentlig: neste søndag regnes som om den forrige ble utført');
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Forfalt søppel', '2026-11-17', '2026-11-23'),
  '{2026-11-22}'::date[], 'forfalt kalenderoppgave spoles fram, uten den forfalte forekomsten');
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hver 3. dag', '2026-12-28', '2027-01-03'),
  '{2026-12-30,2027-01-02}'::date[], 'årsskifte: forekomster på begge sider av nyttår');
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Takrenner', '2026-11-25', '2026-12-07'),
  '{2026-12-01}'::date[], 'månedsoppgave: forekomsten er den 1. i måneden');
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Takrenner', '2026-11-25', '2027-11-25'),
  '{2026-12-01}'::date[], 'månedsoppgave: neste forekomst er først om ett år');
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rense sluk', '2026-11-17', '2026-11-23'),
  '{2026-11-18,2026-11-21}'::date[], 'intervall: frist + intervall, som om den ble utført på fristen');
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engang', '2026-11-17', '2026-11-23'),
  '{2026-11-19}'::date[], 'engangsoppgave: bare fristen');
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engang utført', '2026-11-01', '2026-12-31'),
  '{}'::date[], 'utført engangsoppgave (uten frist) er ikke med');
select is(tests.occ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Arkivert', '2026-11-17', '2026-11-23'),
  '{}'::date[], 'arkiverte oppgaver er ikke med');

-- ---------------------------------------------------------------------------
-- Tilgang og vindu
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.get_upcoming_occurrences(
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-11-17', '2026-11-23')),
  0, 'voksen A ser ingen forekomster i husstand B (RLS)');
select throws_ok(
  $$select * from public.get_upcoming_occurrences('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-01', '2027-01-03')$$,
  '22023', 'invalid_window', 'vindu over ett år gir feil');
select throws_ok(
  $$select * from public.get_upcoming_occurrences('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-11-23', '2026-11-17')$$,
  '22023', 'invalid_window', 'slutt før start gir feil');

select * from finish();
rollback;
