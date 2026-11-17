-- Tester for ledige jobber for utvalgte barn (tasks.job_member_ids).
-- Se docs/DATABASE.md §1–2. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

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

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barna Leah, Ola og Emma.
--   B: voksen B, barn B.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com');

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Leah',     'owl',  2016, null),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Ola',      'frog', 2014, null),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Emma',     'cat',  2018, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'frog', 2015, null);

select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- ===========================================================================
-- 1. En voksen kan lage en jobb for to av tre barn
-- ===========================================================================
select lives_ok($$
  insert into public.tasks (household_id, title, recurrence_type, job_member_ids)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rydde bod', 'job',
          array['aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003']::uuid[])
$$, 'en voksen kan lage en jobb for utvalgte barn');

select is((select job_member_ids from public.today_tasks where title = 'Rydde bod'),
  array['aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003']::uuid[],
  'listen følger med i today_tasks');

select lives_ok($$
  insert into public.tasks (household_id, title, recurrence_type)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Åpen jobb', 'job')
$$, 'uten liste er jobben for alle barna');
select is((select job_member_ids from public.tasks where title = 'Åpen jobb'), '{}'::uuid[],
  'tom liste er standard');

-- ===========================================================================
-- 2. Ugyldige lister avvises
-- ===========================================================================
select throws_ok($$
  insert into public.tasks (household_id, title, recurrence_type, job_member_ids)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feil', 'job',
          array['bbbbbbbb-0000-0000-0000-000000000002']::uuid[])
$$, '23514', 'invalid_member', 'et barn fra en annen husstand avvises');

select throws_ok($$
  insert into public.tasks (household_id, title, recurrence_type, job_member_ids)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feil', 'job',
          array['aaaaaaaa-0000-0000-0000-000000000001']::uuid[])
$$, '23514', 'invalid_member', 'en voksen kan ikke stå i listen');

select throws_ok($$
  insert into public.tasks (household_id, title, recurrence_type, job_member_ids)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feil', 'job',
          array['aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002']::uuid[])
$$, '23514', 'invalid_member', 'samme barn to ganger avvises');

select throws_ok($$
  update public.tasks
  set job_member_ids = array['bbbbbbbb-0000-0000-0000-000000000002']::uuid[]
  where title = 'Rydde bod'
$$, '23514', 'invalid_member', 'også ved endring');

select throws_ok($$
  insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every,
                            job_member_ids)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feil', 'interval', 'day', 1,
          array['aaaaaaaa-0000-0000-0000-000000000002']::uuid[])
$$, '23514', null, 'listen er bare lov for jobber');

select throws_ok($$
  insert into public.tasks (household_id, title, recurrence_type, assigned_member_id)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feil', 'job', 'aaaaaaaa-0000-0000-0000-000000000002')
$$, '23514', null, 'jobber bruker listen, ikke én ansvarlig');

-- ===========================================================================
-- 3. Slettes et barn, fjernes det fra listen
-- ===========================================================================
select lives_ok($$
  delete from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000003'
$$, 'en voksen kan slette et barn som står i en jobb');
select is((select job_member_ids from public.tasks where title = 'Rydde bod'),
  array['aaaaaaaa-0000-0000-0000-000000000002']::uuid[],
  'barnet er fjernet fra listen');

-- ===========================================================================
-- 4. En annen husstand ser ikke jobben
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*)::int from public.tasks where title = 'Rydde bod'), 0,
  'B ser ikke jobbene i A');

select * from finish();
rollback;
