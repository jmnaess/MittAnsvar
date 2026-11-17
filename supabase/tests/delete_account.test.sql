-- Tester for public.delete_my_account_data(). Se migrasjonen *_delete_my_account_data.sql.
-- Alt kjøres i én transaksjon som rulles tilbake, så ingen testdata blir liggende.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- ---------------------------------------------------------------------------
-- Testhjelpere (samme som i rls.test.sql; finnes bare i denne transaksjonen)
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

-- Går tilbake til superbruker, så vi kan telle rader uten RLS.
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

-- ---------------------------------------------------------------------------
-- Testdata (som superbruker)
--   Husstand C: voksen C1, voksen C2, barn C
--   Husstand D: voksen D1, barn D med enhet (anonym bruker), barn D uten enhet
--   E:          innlogget bruker uten medlemskap
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000c001', 'voksen-c1@example.com'),
  ('00000000-0000-0000-0000-00000000c002', 'voksen-c2@example.com'),
  ('00000000-0000-0000-0000-00000000d001', 'voksen-d1@example.com'),
  ('00000000-0000-0000-0000-00000000d002', null),  -- barn D sin anonyme bruker
  ('00000000-0000-0000-0000-00000000e001', 'fremmed@example.com');

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Familien C', 'family', 'house',     now() + interval '14 days'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Familien D', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C1', 'fox',  null, '00000000-0000-0000-0000-00000000c001'),
  ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C2', 'cat',  null, '00000000-0000-0000-0000-00000000c002'),
  ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'child', 'Barn C',    'owl',  2016, null),
  ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'adult', 'Voksen D1', 'bear', null, '00000000-0000-0000-0000-00000000d001'),
  ('dddddddd-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'child', 'Barn D',    'frog', 2015, '00000000-0000-0000-0000-00000000d002'),
  ('dddddddd-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'child', 'Søsken D',  'fox',  2019, null);

-- ===========================================================================
-- 1. Funksjonen og rettighetene
-- ===========================================================================
select has_function('public', 'delete_my_account_data', array[]::text[],
  'delete_my_account_data() finnes og tar ingen parametere');

select set_config('role', 'anon', true);
select throws_ok($$select public.delete_my_account_data()$$, '42501', null,
  'anon kan ikke kalle delete_my_account_data');
select tests.logout();

-- ===========================================================================
-- 2. Klienten kan fortsatt ikke slette husstander eller voksne direkte
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000c001');

select throws_ok($$delete from public.households where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  '42501', null, 'voksen kan ikke slette husstanden direkte');
select is(tests.affected($$delete from public.members
                           where id = 'cccccccc-0000-0000-0000-000000000002'$$), 0,
  'voksen kan ikke slette en annen voksen direkte');
select tests.logout();

-- ===========================================================================
-- 3. Bruker uten medlemskap: ingenting endres
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000e001');
select lives_ok($$select public.delete_my_account_data()$$,
  'bruker uten medlemskap kan kalle funksjonen');
select tests.logout();

select is((select count(*)::int from public.households), 2,
  'bruker uten medlemskap: begge husstandene finnes');
select is((select count(*)::int from public.members), 6,
  'bruker uten medlemskap: alle medlemmer finnes');

-- ===========================================================================
-- 4. Barnets anonyme enhet: barneprofilen består
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000d002');
select lives_ok($$select public.delete_my_account_data()$$,
  'barnets enhet kan kalle funksjonen');
select tests.logout();

select is((select count(*)::int from public.members
           where id = 'dddddddd-0000-0000-0000-000000000002'), 1,
  'barneprofilen består når barnets enhet sletter seg');
select is((select count(*)::int from public.members
           where household_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 3,
  'ingen medlemmer i D er slettet av barnets enhet');

-- ===========================================================================
-- 5. Flere voksne: C1 sletter seg, resten av husstand C består
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000c001');
select lives_ok($$select public.delete_my_account_data()$$,
  'voksen C1 kan slette sine data');
select tests.logout();

select is((select count(*)::int from public.members
           where id = 'cccccccc-0000-0000-0000-000000000001'), 0,
  'C1 sin members-rad er slettet');
select is((select count(*)::int from public.households
           where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 1,
  'husstand C finnes fortsatt (C2 er voksen der)');
select is((select count(*)::int from public.members
           where household_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 2,
  'C2 og barn C finnes fortsatt');

-- ===========================================================================
-- 6. Siste voksne: D1 sletter seg, hele husstand D forsvinner
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000d001');
select lives_ok($$select public.delete_my_account_data()$$,
  'voksen D1 kan slette sine data');
select tests.logout();

select is((select count(*)::int from public.households
           where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 0,
  'husstand D er slettet (D1 var siste voksne)');
select is((select count(*)::int from public.members
           where household_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 0,
  'alle medlemmer i D er slettet, også barneprofilene');

-- ===========================================================================
-- 7. Andres data: D1 sitt kall rørte ikke husstand C
-- ===========================================================================
select is((select count(*)::int from public.members
           where household_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 2,
  'D1 sitt kall rørte ikke medlemmene i C');

-- ===========================================================================
-- 8. Siste voksne i C (C2) sletter seg: nå forsvinner også C
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000c002');
select lives_ok($$select public.delete_my_account_data()$$,
  'voksen C2 kan slette sine data');
select tests.logout();

select is((select count(*)::int from public.households), 0,
  'husstand C er slettet når siste voksne (C2) sletter seg');

select * from finish();
rollback;
