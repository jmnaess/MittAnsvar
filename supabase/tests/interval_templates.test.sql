-- Tester for intervallmaler: første frist ett intervall frem når oppgaven lages fra en mal,
-- og uendret (i dag) for egne intervalloppgaver. Se *_interval_templates.sql. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

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

grant execute on all functions in schema tests to anon, authenticated;

create table tests.d as select private.local_today('Europe/Oslo') as today;
grant select on tests.d to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata: husstand A med én voksen. To intervallmaler og én årsmal.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'couple', 'house', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',
   '00000000-0000-0000-0000-00000000a001');

insert into public.task_templates
  (id, slug, title, description, category, recurrence_type, recurrence_unit, recurrence_every, month, requires)
values
  ('99999999-0000-0000-0000-000000000001', 'test-weeks', 'Hver 8. uke', 'Test', 'maintenance',
   'interval', 'week', 8, null, '{"has_air_heat_pump": true}'),
  ('99999999-0000-0000-0000-000000000002', 'test-months', 'Hver 6. måned', 'Test', 'maintenance',
   'interval', 'month', 6, null, null),
  ('99999999-0000-0000-0000-000000000003', 'test-year', 'Årlig', 'Test', 'maintenance',
   'calendar', 'year', 1, 1, null);

select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- ===========================================================================
-- 1. Fra mal: første frist ett intervall frem
-- ===========================================================================
select is(public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  array['99999999-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000002',
        '99999999-0000-0000-0000-000000000003']::uuid[]), 3,
  'tre maler aktivert');

select is(
  (select next_due_on from public.tasks where template_id = '99999999-0000-0000-0000-000000000001'),
  (select today + 56 from tests.d),
  'intervallmal (8 uker): første frist om 8 uker');

select is(
  (select next_due_on from public.tasks where template_id = '99999999-0000-0000-0000-000000000002'),
  (select (today + interval '6 months')::date from tests.d),
  'intervallmal (6 måneder): første frist om 6 måneder');

select is(
  (select anchor_on from public.tasks where template_id = '99999999-0000-0000-0000-000000000001'),
  (select today from tests.d),
  'anchor_on er fortsatt i dag');

select is(
  (select row(recurrence_type, recurrence_unit, recurrence_every, month)::text
   from public.tasks where template_id = '99999999-0000-0000-0000-000000000001'),
  '(interval,week,8,)',
  'gjentakelsen er kopiert fra malen');

select is(
  (select count(*)::int from public.today_tasks where template_id = '99999999-0000-0000-0000-000000000001'), 0,
  'intervalloppgaven fra malen er ikke i «I dag» med en gang');

-- Årsmalen følger samme regel som før (første forekomst i januar).
select is(
  (select extract(month from next_due_on)::int from public.tasks
   where template_id = '99999999-0000-0000-0000-000000000003'), 1,
  'årsmal: første frist uendret (januar)');

-- ===========================================================================
-- 2. Egne intervalloppgaver: uendret, første frist i dag
-- ===========================================================================
insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Egen intervall', 'interval', 'week', 8);

select is(
  (select next_due_on from public.tasks where title = 'Egen intervall'),
  (select today from tests.d),
  'egen intervalloppgave: første frist i dag (uendret)');

-- ===========================================================================
-- 3. Ny gjentakelse på en oppgave fra mal: starter på nytt fra i dag, som andre oppgaver
-- ===========================================================================
update public.tasks set recurrence_every = 4
where template_id = '99999999-0000-0000-0000-000000000001';

select is(
  (select next_due_on from public.tasks where template_id = '99999999-0000-0000-0000-000000000001'),
  (select today from tests.d),
  'endret gjentakelse: første frist i dag, som for andre oppgaver');

-- ===========================================================================
-- 4. Etter utført: «N etter sist utført» som før
-- ===========================================================================
select is(
  (select private.compute_next_due(t, (select today from tests.d))
   from public.tasks t where template_id = '99999999-0000-0000-0000-000000000002'),
  (select (today + interval '6 months')::date from tests.d),
  'neste frist etter utført: 6 måneder etter');

select * from finish();
rollback;
