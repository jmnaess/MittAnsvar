-- Tester for public.create_household(). Se migrasjonen *_create_household.sql.
-- Alt kjøres i én transaksjon som rulles tilbake, så ingen testdata blir liggende.
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

-- ---------------------------------------------------------------------------
-- Testhjelpere (samme som i de andre testfilene; finnes bare i denne transaksjonen)
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

-- Barnets enhet logger inn anonymt. Supabase setter da is_anonymous = true i tokenet.
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

grant execute on all functions in schema tests to anon, authenticated;

-- Husker id-en fra første kall, så senere tester kan slå opp husstanden.
create table tests.result (household_id uuid);

-- Rader som fantes før testen (f.eks. utviklingsdata i den lokale databasen). Tellingene under
-- sammenlignes med dette, så testen bare ser på det den selv har laget.
create table tests.baseline as
select (select count(*)::int from public.households) as households,
       (select count(*)::int from public.members)    as members;
grant all on tests.result to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata (som superbruker)
--   N: ny bruker uten husstand
--   G: voksen som allerede er i husstand G
--   K: barnets anonyme enhet (ikke medlem ennå)
--   T: bruker som prøver et ugyldig navn
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ny@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'har-husstand@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', null),
  ('00000000-0000-0000-0000-0000000000d1', 'tomt-navn@example.com');

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('99999999-9999-9999-9999-999999999999', 'Familien G', 'family', 'house', now() + interval '14 days');

insert into public.members (household_id, role, display_name, avatar, auth_user_id) values
  ('99999999-9999-9999-9999-999999999999', 'adult', 'Voksen G', 'fox', '00000000-0000-0000-0000-0000000000b1');

-- ===========================================================================
-- 1. Funksjonen og rettighetene
-- ===========================================================================
select has_function('public', 'create_household',
  array['text', 'household_type', 'housing_type', 'text', 'text'],
  'create_household finnes med navn, type, boligtype, visningsnavn og avatar (ingen trial_ends_at)');

select set_config('role', 'anon', true);
select throws_ok(
  $$select public.create_household('Hjem', 'single', 'apartment', 'Ola', 'fox')$$,
  '42501', null, 'anon kan ikke kalle create_household');
select tests.logout();

-- ===========================================================================
-- 2. Ny bruker oppretter husstand
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000a1');

select lives_ok(
  $$insert into tests.result
    select public.create_household('  Familien N  ', 'family', 'townhouse', ' Kari ', 'owl')$$,
  'ny bruker kan opprette husstand');

select isnt((select household_id from tests.result), null,
  'create_household returnerer id-en til husstanden');

select is((select count(*)::int from public.households), 1,
  'brukeren ser den nye husstanden via RLS');

select tests.logout();

select results_eq(
  $$select name, type::text, housing_type::text, feedback_tone::text
    from public.households where id = (select household_id from tests.result)$$,
  $$values ('Familien N', 'family', 'townhouse', 'both')$$,
  'husstanden har trimmet navn, type og boligtype fra kallet, og standardtone');

select is((select trial_ends_at from public.households where id = (select household_id from tests.result)),
  now() + interval '14 days',
  'trial_ends_at er satt av serveren til 14 dager fram i tid');

select is((select count(*)::int from public.members
           where household_id = (select household_id from tests.result)), 1,
  'husstanden har nøyaktig ett medlem');

select results_eq(
  $$select auth_user_id, role::text, display_name, avatar, birth_year
    from public.members where household_id = (select household_id from tests.result)$$,
  $$values ('00000000-0000-0000-0000-0000000000a1'::uuid, 'adult', 'Kari', 'owl', null::smallint)$$,
  'medlemmet er den innloggede brukeren, som voksen, med trimmet navn');

-- ===========================================================================
-- 3. Nytt kall fra samme bruker avvises
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$select public.create_household('Hytta', 'couple', 'house', 'Kari', 'owl')$$,
  'P0001', 'already_in_household', 'nytt kall fra samme bruker avvises');
select tests.logout();

select is((select count(*)::int from public.members
           where auth_user_id = '00000000-0000-0000-0000-0000000000a1'), 1,
  'brukeren er fortsatt bare medlem ett sted');
select is((select count(*)::int from public.households), (select households + 2 from tests.baseline),
  'ingen ny husstand ble opprettet av det avviste kallet');

-- ===========================================================================
-- 4. Voksen i en eksisterende husstand avvises
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok(
  $$select public.create_household('Ny', 'single', 'apartment', 'Voksen G', 'fox')$$,
  'P0001', 'already_in_household', 'voksen som allerede har husstand avvises');
select tests.logout();

-- ===========================================================================
-- 5. Anonym bruker (barnets enhet) avvises
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$select public.create_household('Barnas hus', 'family', 'house', 'Barn', 'frog')$$,
  'P0001', 'anonymous_not_allowed', 'anonym bruker kan ikke opprette husstand');
select tests.logout();

select is((select count(*)::int from public.members
           where auth_user_id = '00000000-0000-0000-0000-0000000000c1'), 0,
  'den anonyme brukeren ble ikke medlem');

-- ===========================================================================
-- 6. Ugyldig navn: feil, og ingenting blir liggende (atomisk)
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000d1');
select throws_ok(
  $$select public.create_household('   ', 'single', 'apartment', 'Tor', 'cat')$$,
  '23514', null, 'tomt husstandsnavn avvises');
select throws_ok(
  $$select public.create_household('Gyldig', 'single', 'apartment', '', 'cat')$$,
  '23514', null, 'tomt visningsnavn avvises');
select tests.logout();

select is((select count(*)::int from public.households), (select households + 2 from tests.baseline),
  'ingen halvferdig husstand ble liggende etter feilene');
select is((select count(*)::int from public.members
           where auth_user_id = '00000000-0000-0000-0000-0000000000d1'), 0,
  'brukeren med ugyldig navn ble ikke medlem');

select * from finish();
rollback;
