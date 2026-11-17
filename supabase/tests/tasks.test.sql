-- Tester for public.tasks: RLS, kolonnerettigheter, triggeren som setter frist, og today_tasks.
-- Se docs/DATABASE.md §1, §2 og §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

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

grant execute on all functions in schema tests to anon, authenticated;

-- «I dag» og ukedagen i dag i Oslo. Testene skal virke uansett hvilken dag de kjøres.
create table tests.d as
select private.local_today('Europe/Oslo')                                   as today,
       extract(isodow from private.local_today('Europe/Oslo'))::smallint     as dow_today,
       extract(isodow from private.local_today('Europe/Oslo') + 1)::smallint as dow_tomorrow;
grant select on tests.d to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A med enhet, søsken A uten enhet
--   B: voksen B, barn B
--   C: voksen C, prøvetiden er utløpt
--   F: innlogget uten medlemskap
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000a002', null),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com'),
  ('00000000-0000-0000-0000-00000000c001', 'voksen-c@example.com'),
  ('00000000-0000-0000-0000-00000000f001', 'fremmed@example.com');

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Familien A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Familien B', 'family', 'apartment', now() + interval '14 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Utløpt',     'single', 'apartment', now() - interval '1 day');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A',   'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Søsken A', 'bear', 2019, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'frog', 2015, null),
  ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C', 'cat',  null, '00000000-0000-0000-0000-00000000c001');

-- ===========================================================================
-- 1. Voksen A oppretter oppgaver. Triggeren setter anchor_on, created_by og next_due_on.
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select lives_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, weekdays)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'Ukedag i dag', 'calendar', 'week', 1, array[(select dow_today from tests.d)])$$,
  'voksen A kan opprette en oppgave med fast kalender');
select lives_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every, weekdays)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'Ukedag i morgen', 'calendar', 'week', 1, array[(select dow_tomorrow from tests.d)])$$,
  'voksen A kan opprette en oppgave som forfaller i morgen');
select lives_ok(
  $$insert into public.tasks (household_id, title, assigned_member_id, recurrence_type, recurrence_unit, recurrence_every)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'Rense sluk', 'aaaaaaaa-0000-0000-0000-000000000003', 'interval', 'day', 14)$$,
  'voksen A kan opprette en intervalloppgave for et barn');

-- Klienten kan ikke velge id selv. Vi slår opp id-ene som superbruker og gir dem et nummer.
select tests.logout();
create table tests.ids as
select case title when 'Ukedag i dag' then 1 when 'Ukedag i morgen' then 2 when 'Rense sluk' then 3 end as k, id
from public.tasks;
grant select on tests.ids to authenticated;
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select is((select next_due_on from public.tasks where id = (select id from tests.ids where k = 1)),
  (select today from tests.d), 'kalender: frist i dag når ukedagen er i dag');
select is((select next_due_on from public.tasks where id = (select id from tests.ids where k = 2)),
  (select today + 1 from tests.d), 'kalender: frist i morgen når ukedagen er i morgen');
select is((select next_due_on from public.tasks where id = (select id from tests.ids where k = 3)),
  (select today from tests.d), 'intervall: første frist er i dag');
select is((select anchor_on from public.tasks where id = (select id from tests.ids where k = 3)),
  (select today from tests.d), 'anchor_on settes til i dag');
select is((select created_by from public.tasks where id = (select id from tests.ids where k = 3)),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'created_by settes til den innloggede');
select is((select category from public.tasks where id = (select id from tests.ids where k = 3)),
  'other', 'kategori er other når den ikke er valgt');

-- ===========================================================================
-- 2. Voksen A: det som ikke skal være lov
-- ===========================================================================
select throws_ok(
  $$insert into public.tasks (household_id, title, assigned_member_id, recurrence_type)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feil ansvarlig',
            'bbbbbbbb-0000-0000-0000-000000000002', 'once')$$,
  '23503', null, 'ansvarlig kan ikke være et medlem i en annen husstand');
select throws_ok(
  $$insert into public.tasks (household_id, title, recurrence_type)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Inntrenger', 'once')$$,
  '42501', null, 'voksen A kan ikke opprette oppgave i B');
select throws_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, next_due_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Egen frist', 'once', '2030-01-01')$$,
  '42501', null, 'klienten kan ikke sette next_due_on ved insert');
select throws_ok(
  $$insert into public.tasks (household_id, title, recurrence_type, anchor_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Eget anker', 'once', '2030-01-01')$$,
  '42501', null, 'klienten kan ikke sette anchor_on');
select throws_ok(
  $$update public.tasks set next_due_on = '2030-01-01'
    where id = (select id from tests.ids where k = 1)$$,
  '42501', null, 'klienten kan ikke endre next_due_on');
select throws_ok(
  $$update public.tasks set created_by = null
    where id = (select id from tests.ids where k = 1)$$,
  '42501', null, 'klienten kan ikke endre created_by');
select throws_ok(
  $$update public.tasks set household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    where id = (select id from tests.ids where k = 1)$$,
  '42501', null, 'oppgaven kan ikke flyttes til en annen husstand');
select throws_ok(
  $$delete from public.tasks where id = (select id from tests.ids where k = 1)$$,
  '42501', null, 'oppgaver kan ikke slettes (de arkiveres)');

-- ===========================================================================
-- 3. Voksen A endrer og arkiverer
-- ===========================================================================
select is(tests.affected($$update public.tasks set title = 'Nytt navn'
                           where id = (select id from tests.ids where k = 1)$$), 1,
  'voksen A kan endre tittel');
select is((select next_due_on from public.tasks where id = (select id from tests.ids where k = 1)),
  (select today from tests.d), 'endret tittel endrer ikke fristen');

update public.tasks
set weekdays = array[(select dow_tomorrow from tests.d)]
where id = (select id from tests.ids where k = 1);
select is((select next_due_on from public.tasks where id = (select id from tests.ids where k = 1)),
  (select today + 1 from tests.d), 'endret gjentakelse gir ny frist');

select is(tests.affected($$update public.tasks set archived_at = now()
                           where id = (select id from tests.ids where k = 2)$$), 1,
  'voksen A kan arkivere');

-- ===========================================================================
-- 4. Andre brukere
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*)::int from public.tasks), 0, 'voksen B ser ingen oppgaver fra A');
select is(tests.affected($$update public.tasks set title = 'Hacket'
                           where id = (select id from tests.ids where k = 1)$$), 0,
  'voksen B kan ikke endre oppgaver i A');

select tests.login_as('00000000-0000-0000-0000-00000000a002');
select is((select count(*)::int from public.tasks), 3, 'barn A ser alle oppgavene i husstanden');
select throws_ok(
  $$insert into public.tasks (household_id, title, recurrence_type)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Barnets oppgave', 'once')$$,
  '42501', null, 'barn kan ikke opprette oppgaver');
select is(tests.affected($$update public.tasks set title = 'Barnet endret'
                           where id = (select id from tests.ids where k = 3)$$), 0,
  'barn kan ikke endre oppgaver');

select tests.login_as('00000000-0000-0000-0000-00000000f001');
select is((select count(*)::int from public.tasks), 0, 'bruker uten medlemskap ser ingenting');

select tests.login_as('00000000-0000-0000-0000-00000000c001');
select throws_ok(
  $$insert into public.tasks (household_id, title, recurrence_type)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Etter prøvetid', 'once')$$,
  '42501', null, 'utløpt prøvetid: kan ikke opprette oppgaver');

-- ===========================================================================
-- 5. today_tasks: forfalte og dagens, ikke fremtidige eller arkiverte
-- ===========================================================================
select tests.logout();
-- Superbrukeren setter fristene direkte. Triggeren rører dem ikke når gjentakelsen er uendret.
insert into public.tasks (id, household_id, title, recurrence_type) values
  ('11111111-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Forfalt', 'once'),
  ('11111111-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fremtid', 'once'),
  ('11111111-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ferdig',  'once'),
  ('11111111-0000-0000-0000-000000000020', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B i dag', 'once');
update public.tasks set next_due_on = (select today - 3 from tests.d)
  where id = '11111111-0000-0000-0000-000000000010';
update public.tasks set next_due_on = (select today + 5 from tests.d)
  where id = '11111111-0000-0000-0000-000000000011';
update public.tasks set next_due_on = null
  where id = '11111111-0000-0000-0000-000000000012';
-- Oppgave 2 er arkivert, men frist i dag skal ikke gi treff.
update public.tasks set next_due_on = (select today from tests.d)
  where id = (select id from tests.ids where k = 2);

select tests.login_as('00000000-0000-0000-0000-00000000a001');
-- I dag: «Rense sluk» (i dag) og «Forfalt». Ikke: oppgave 1 (i morgen), 2 (arkivert),
-- «Fremtid», «Ferdig» eller B sin.
select set_eq(
  $$select title from public.today_tasks$$,
  array['Rense sluk', 'Forfalt'],
  'today_tasks gir forfalte og dagens oppgaver i egen husstand');
select is((select is_overdue from public.today_tasks where title = 'Forfalt'), true,
  'forfalt oppgave er merket is_overdue');
select is((select is_overdue from public.today_tasks where title = 'Rense sluk'), false,
  'dagens oppgave er ikke merket is_overdue');

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select set_eq($$select title from public.today_tasks$$, array['B i dag'],
  'voksen B ser bare sin egen husstand i today_tasks');

select tests.login_as('00000000-0000-0000-0000-00000000f001');
select is((select count(*)::int from public.today_tasks), 0,
  'bruker uten medlemskap ser ingenting i today_tasks');

select * from finish();
rollback;
