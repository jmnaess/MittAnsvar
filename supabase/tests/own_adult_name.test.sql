-- Tester for at voksne bare kan endre sitt eget navn. Se *_own_adult_name.sql.
-- Alt kjøres i én transaksjon som rulles tilbake, så ingen testdata blir liggende.
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

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

-- Husstand E: voksen E1, voksen E2, barn E med enhet
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000e001', 'voksen-e1@example.com', false),
  ('00000000-0000-0000-0000-00000000e002', 'voksen-e2@example.com', false),
  ('00000000-0000-0000-0000-00000000e003', null, true);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Familien E', 'family', 'house', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'adult', 'Voksen E1', 'fox', null, '00000000-0000-0000-0000-00000000e001'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'adult', 'Voksen E2', 'cat', null, '00000000-0000-0000-0000-00000000e002'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'child', 'Barn E',    'owl', 2016, '00000000-0000-0000-0000-00000000e003');

-- Voksen E1
select tests.login_as('00000000-0000-0000-0000-00000000e001');

select is(tests.affected($$update public.members set display_name = 'Ny E1'
                           where id = 'eeeeeeee-0000-0000-0000-000000000001'$$), 1,
  'voksen kan endre sitt eget navn');
select is(tests.affected($$update public.members set display_name = 'Nytt barn'
                           where id = 'eeeeeeee-0000-0000-0000-000000000003'$$), 1,
  'voksen kan endre barnets navn');
select throws_ok($$update public.members set display_name = 'Hacket'
                   where id = 'eeeeeeee-0000-0000-0000-000000000002'$$,
  'P0001', 'not_own_name', 'voksen kan ikke endre navnet til en annen voksen');
select throws_ok($$update public.members set avatar = 'bear'
                   where id = 'eeeeeeee-0000-0000-0000-000000000002'$$,
  'P0001', 'not_own_profile', 'voksen kan heller ikke endre figuren til en annen voksen');
select is(tests.affected($$update public.members set display_name = 'Voksen E2', birth_year = null
                           where id = 'eeeeeeee-0000-0000-0000-000000000002'$$), 1,
  'uendret navn i samme oppdatering stoppes ikke');

-- Barn E
select tests.login_as('00000000-0000-0000-0000-00000000e003');
select is(tests.affected($$update public.members set display_name = 'Sjefen'
                           where id = 'eeeeeeee-0000-0000-0000-000000000003'$$), 0,
  'barn kan ikke endre sitt eget navn');

select tests.logout();
select is((select display_name from public.members where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  'Voksen E2', 'navnet til voksen E2 er uendret');

select * from finish();
rollback;
