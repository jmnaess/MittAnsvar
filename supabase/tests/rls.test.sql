-- RLS-tester for households og members. Se docs/DATABASE.md §5.
-- Alt kjøres i én transaksjon som rulles tilbake, så ingen testdata blir liggende.
begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

-- ---------------------------------------------------------------------------
-- Testhjelpere (finnes bare i denne transaksjonen)
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated;

-- "Logger inn" som en bruker: setter rollen og JWT-claims som auth.uid() leser.
create function tests.login_as(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Kjører en insert/update/delete og returnerer antall berørte rader.
-- RLS gir ikke feil på update/delete – radene blir bare usynlige – så vi teller.
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

-- ---------------------------------------------------------------------------
-- Testdata (som superbruker)
--   Husstand A: voksen A, barn A med egen enhet, barn A uten enhet
--   Husstand B: voksen B, barn B
--   Fremmed:    innlogget bruker uten medlemskap
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000a002', null),  -- barnets anonyme bruker
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com'),
  ('00000000-0000-0000-0000-00000000f001', 'fremmed@example.com');

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Familien A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Familien B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A',   'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Søsken A', 'bear', 2019, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'frog', 2015, null);

-- ===========================================================================
-- 1. Voksen A: ser egen husstand, ingenting fra B
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select is((select count(*)::int from public.households), 1,
  'voksen A ser bare én husstand');
select is((select name from public.households), 'Familien A',
  'voksen A ser sin egen husstand');
select is((select count(*)::int from public.members), 3,
  'voksen A ser de tre medlemmene i A');
select is((select count(*)::int from public.members
           where household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0,
  'voksen A ser ingen medlemmer i B');

select is(tests.affected($$update public.households set name = 'Hacket'
                           where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$), 0,
  'voksen A kan ikke endre husstand B');
select is(tests.affected($$update public.members set display_name = 'Hacket'
                           where id = 'bbbbbbbb-0000-0000-0000-000000000002'$$), 0,
  'voksen A kan ikke endre barn i B');
select is(tests.affected($$delete from public.members
                           where id = 'bbbbbbbb-0000-0000-0000-000000000002'$$), 0,
  'voksen A kan ikke slette barn i B');
select throws_ok(
  $$insert into public.members (household_id, role, display_name, avatar)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Inntrenger', 'fox')$$,
  '42501', null, 'voksen A kan ikke legge til barn i B');

-- ===========================================================================
-- 2. Voksen A: det som skal være lov (så vi vet at policyene ikke nekter alt)
-- ===========================================================================
select is(tests.affected($$update public.households
                           set name = 'Familien A2', feedback_tone = 'humor'
                           where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$), 1,
  'voksen A kan endre navn og tone på egen husstand');
select lives_ok(
  $$insert into public.members (id, household_id, role, display_name, avatar, birth_year)
    values ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'child', 'Nytt barn', 'fox', 2020)$$,
  'voksen A kan legge til barneprofil');
select is(tests.affected($$update public.members set display_name = 'Omdøpt', birth_year = 2021
                           where id = 'aaaaaaaa-0000-0000-0000-000000000004'$$), 1,
  'voksen A kan endre barneprofil');
select is(tests.affected($$delete from public.members
                           where id = 'aaaaaaaa-0000-0000-0000-000000000004'$$), 1,
  'voksen A kan slette barneprofil');

-- ===========================================================================
-- 3. Voksen A: det som ikke skal være lov i egen husstand
-- ===========================================================================
select throws_ok(
  $$insert into public.members (household_id, role, display_name, avatar)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Ny voksen', 'fox')$$,
  '42501', null, 'voksen kan ikke legge til en voksen direkte (skjer via invitasjon)');
select throws_ok(
  $$insert into public.members (household_id, role, display_name, avatar, auth_user_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Med enhet', 'fox',
            '00000000-0000-0000-0000-00000000f001')$$,
  '42501', null, 'voksen kan ikke legge til barn med auth_user_id (skjer via QR)');
select is(tests.affected($$delete from public.members
                           where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$), 0,
  'voksen kan ikke slette en voksen (skjer via delete-account)');
select throws_ok(
  $$insert into public.households (name, type, housing_type, trial_ends_at)
    values ('Ny', 'single', 'apartment', now() + interval '1 year')$$,
  '42501', null, 'voksen kan ikke opprette husstand direkte (skjer via create_household)');
select throws_ok(
  $$delete from public.households where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null, 'voksen kan ikke slette husstand direkte');

-- Kolonner som styrer tilgang
select throws_ok(
  $$update public.members set auth_user_id = '00000000-0000-0000-0000-00000000f001'
    where id = 'aaaaaaaa-0000-0000-0000-000000000003'$$,
  '42501', null, 'voksen kan ikke endre auth_user_id');
select throws_ok(
  $$update public.members set auth_user_id = null
    where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  '42501', null, 'voksen kan ikke koble fra enhet direkte (skjer via unlink_member_device)');
select throws_ok(
  $$update public.members set role = 'adult', birth_year = null
    where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  '42501', null, 'voksen kan ikke endre rolle');
select throws_ok(
  $$update public.members set household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    where id = 'aaaaaaaa-0000-0000-0000-000000000003'$$,
  '42501', null, 'voksen kan ikke flytte medlem til annen husstand');
select throws_ok(
  $$update public.households set trial_ends_at = now() + interval '10 years'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null, 'voksen kan ikke endre trial_ends_at');

reset role;

-- ===========================================================================
-- 4. Barn A (egen enhet, anonym bruker): kan lese, ikke endre
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a002');

select is((select count(*)::int from public.members), 3,
  'barn ser medlemmene i egen husstand');
select is((select count(*)::int from public.members
           where household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0,
  'barn ser ingen medlemmer i B');
select throws_ok(
  $$insert into public.members (household_id, role, display_name, avatar)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Venn', 'fox')$$,
  '42501', null, 'barn kan ikke legge til medlemmer');
select is(tests.affected($$update public.members set display_name = 'Sjefen'
                           where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$), 0,
  'barn kan ikke endre egen profil');
select is(tests.affected($$update public.members set display_name = 'Dust'
                           where id = 'aaaaaaaa-0000-0000-0000-000000000003'$$), 0,
  'barn kan ikke endre søskens profil');
select is(tests.affected($$delete from public.members
                           where id = 'aaaaaaaa-0000-0000-0000-000000000003'$$), 0,
  'barn kan ikke slette søsken');
select is(tests.affected($$update public.households set name = 'Barnas hus'
                           where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$), 0,
  'barn kan ikke endre husstanden');
select throws_ok(
  $$update public.members set auth_user_id = null
    where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  '42501', null, 'barn kan ikke endre auth_user_id');
select throws_ok(
  $$update public.households set trial_ends_at = now() + interval '10 years'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null, 'barn kan ikke endre trial_ends_at');

reset role;

-- ===========================================================================
-- 5. Innlogget uten medlemskap: ser ingenting
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000f001');

select is((select count(*)::int from public.households), 0,
  'bruker uten medlemskap ser ingen husstander');
select is((select count(*)::int from public.members), 0,
  'bruker uten medlemskap ser ingen medlemmer');

reset role;

-- ===========================================================================
-- 6. anon (ikke innlogget): ingen rettigheter i det hele tatt
-- ===========================================================================
set local role anon;

select throws_ok($$select * from public.members$$, '42501', null,
  'anon kan ikke lese members');
select throws_ok(
  $$update public.members set auth_user_id = null$$,
  '42501', null, 'anon kan ikke endre auth_user_id');
select throws_ok(
  $$update public.households set trial_ends_at = now()$$,
  '42501', null, 'anon kan ikke endre trial_ends_at');

reset role;

-- ===========================================================================
-- 7. Kontroll som superbruker: ingenting ble endret av forsøkene over
-- ===========================================================================
select is((select name from public.households where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'Familien B', 'husstand B er uendret');
select is((select count(*)::int from public.members
           where household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 2,
  'medlemmene i B finnes fortsatt');
select is((select display_name from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'Søsken A', 'søsken A er uendret');
select is((select auth_user_id from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-00000000a002'::uuid, 'barnets enhet er fortsatt koblet');

-- ===========================================================================
-- 8. Check-constraints
-- ===========================================================================
select throws_ok(
  $$insert into public.members (household_id, role, display_name, avatar, birth_year)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen', 'fox', 1985)$$,
  '23514', null, 'voksen kan ikke ha fødselsår');
select throws_ok(
  $$insert into public.members (household_id, role, display_name, avatar)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', '', 'fox')$$,
  '23514', null, 'tomt visningsnavn avvises');
select throws_ok(
  $$insert into public.households (name, type, housing_type, trial_ends_at)
    values (repeat('x', 51), 'single', 'apartment', now())$$,
  '23514', null, 'husstandsnavn over 50 tegn avvises');

select * from finish();
rollback;
