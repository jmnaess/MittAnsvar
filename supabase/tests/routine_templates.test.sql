-- Tester for rutinemaler (steg 16): nye kolonner på task_templates og activate_templates med
-- ansvarlig per mal. Se docs/DATABASE.md §4. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

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
--   A: familie. Voksen A, barn A1 (2016) og barn A2 (2012).
--   B: annen husstand med barn B1.
--   Maler: én barnemal med lønn, én felles ukesrutine, én årsmal.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com');

insert into public.households (id, name, type, housing_type, feedback_tone, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house', 'fact', now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'house', 'fact', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox', null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A1',  'owl', 2016, null),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A2',  'cat', 2012, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat', null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B1',  'owl', 2015, null);

insert into public.task_templates
  (id, slug, title, description, category, audience, min_age, max_age, reward_nok, suggested_by_default,
   recurrence_type, recurrence_unit, recurrence_every, weekdays, month)
values
  ('99999999-0000-0000-0000-000000000001', 'test-child', 'Dekke bordet', 'Test', 'kitchen',
   'child', 6, 12, 10, false, 'calendar', 'day', 1, null, null),
  ('99999999-0000-0000-0000-000000000002', 'test-shared', 'Vaske badet', 'Test', 'tidying',
   'any', null, null, null, true, 'calendar', 'week', 1, '{6}', null),
  ('99999999-0000-0000-0000-000000000003', 'test-year', 'Årsmal', 'Test', 'maintenance',
   'any', null, null, null, true, 'calendar', 'year', 1, null, 3);

-- ===========================================================================
-- 1. Kolonnene
-- ===========================================================================
-- Startsettet (*_routine_templates.sql).
select is((select count(*)::int from public.task_templates where slug like 'routine-%'), 25,
  '25 rutinemaler');
select is((select count(*)::int from public.task_templates
           where slug like 'routine-%' and audience = 'child' and household_types = '{family}'), 15,
  '15 barnemaler, bare for familier');
select is((select count(*)::int from public.task_templates
           where slug like 'routine-%' and audience <> 'child' and household_types is null
             and suggested_by_default), 3,
  'tre felles maler er avhuket fra start');
select is((select count(*)::int from public.task_templates
           where slug like 'routine-%' and household_types = '{couple,single}' and suggested_by_default), 0,
  'malene for par og enslige er ikke avhuket');
select is((select count(*)::int from public.task_templates
           where slug like 'routine-%'
             and not (recurrence_type = 'calendar' and recurrence_unit in ('day', 'week', 'month')
                      and season_start_month is null and requires is null)), 0,
  'alle rutiner er fast dag, uke eller måned, uten periode og uten betingelser');
select is((select count(*)::int from public.task_templates
           where slug like 'routine-%' and audience = 'child' and min_age is null and max_age is null), 1,
  'én barnemal uten aldersgrense (til barn uten fødselsår)');

select is((select count(*)::int from public.task_templates
           where slug not like 'test-%' and slug not like 'routine-%'
             and (audience <> 'any' or min_age is not null
             or max_age is not null or reward_nok is not null or not suggested_by_default)), 0,
  'eksisterende maler: any, ingen alder eller lønn, avhuket');

select throws_ok(
  $$insert into public.task_templates (slug, title, description, category, audience, min_age,
      recurrence_type, recurrence_unit, recurrence_every)
    values ('x1', 'X', 'X', 'other', 'any', 6, 'calendar', 'day', 1)$$,
  '23514', null, 'alder bare på barnemaler');
select throws_ok(
  $$insert into public.task_templates (slug, title, description, category, audience, reward_nok,
      recurrence_type, recurrence_unit, recurrence_every)
    values ('x2', 'X', 'X', 'other', 'adult', 10, 'calendar', 'day', 1)$$,
  '23514', null, 'lønn bare på barnemaler');
select throws_ok(
  $$insert into public.task_templates (slug, title, description, category, audience, min_age, max_age,
      recurrence_type, recurrence_unit, recurrence_every)
    values ('x3', 'X', 'X', 'other', 'child', 10, 6, 'calendar', 'day', 1)$$,
  '23514', null, 'min_age kan ikke være større enn max_age');
select throws_ok(
  $$insert into public.task_templates (slug, title, description, category, audience, reward_nok,
      recurrence_type, recurrence_unit, recurrence_every)
    values ('x4', 'X', 'X', 'other', 'child', 0, 'calendar', 'day', 1)$$,
  '23514', null, 'lønn må være minst 1 kr');

-- ===========================================================================
-- 2. Aktivering per barn
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select is(
  public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    array['99999999-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001',
          '99999999-0000-0000-0000-000000000002']::uuid[],
    array['aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', null]::uuid[]),
  3, 'barnemal til to barn og én felles mal gir tre oppgaver');

select is((select count(*)::int from public.tasks
           where template_id = '99999999-0000-0000-0000-000000000001'), 2,
  'én oppgave per barn fra samme mal');
select is((select array_agg(assigned_member_id order by assigned_member_id)::text from public.tasks
           where template_id = '99999999-0000-0000-0000-000000000001'),
  '{aaaaaaaa-0000-0000-0000-000000000002,aaaaaaaa-0000-0000-0000-000000000003}',
  'barneoppgavene er tildelt hvert sitt barn');
select is((select min(reward_nok) from public.tasks
           where template_id = '99999999-0000-0000-0000-000000000001'), 10,
  'lønnen kopieres når et barn får oppgaven');
select ok((select assigned_member_id is null and reward_nok is null from public.tasks
           where template_id = '99999999-0000-0000-0000-000000000002'),
  'felles mal: ingen ansvarlig og ingen lønn');

select is(
  public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    array['99999999-0000-0000-0000-000000000001']::uuid[],
    array['aaaaaaaa-0000-0000-0000-000000000002']::uuid[]),
  0, 'samme barnemal til samme barn hoppes over');

-- En felles mal som er tildelt en person etterpå, lages ikke på nytt.
update public.tasks set assigned_member_id = 'aaaaaaaa-0000-0000-0000-000000000001'
where template_id = '99999999-0000-0000-0000-000000000002';
select is(
  public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    array['99999999-0000-0000-0000-000000000002']::uuid[]),
  0, 'aktiv vanlig mal (også tildelt en person) lages ikke på nytt');

-- Den gamle formen (uten medlemmer) virker som før.
select is(
  public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    array['99999999-0000-0000-0000-000000000003']::uuid[]),
  1, 'kall uten medlemmer gir felles oppgave som før');

-- ===========================================================================
-- 3. Ugyldig tildeling
-- ===========================================================================
select throws_ok(
  $$select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      array['99999999-0000-0000-0000-000000000001']::uuid[])$$,
  '22023', 'invalid_assignment', 'barnemal uten barn avvises');
select throws_ok(
  $$select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      array['99999999-0000-0000-0000-000000000001']::uuid[],
      array['aaaaaaaa-0000-0000-0000-000000000001']::uuid[])$$,
  '22023', 'invalid_assignment', 'barnemal til en voksen avvises');
select throws_ok(
  $$select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      array['99999999-0000-0000-0000-000000000001']::uuid[],
      array['bbbbbbbb-0000-0000-0000-000000000002']::uuid[])$$,
  '22023', 'invalid_assignment', 'barnemal til et barn i en annen husstand avvises');
select throws_ok(
  $$select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      array['99999999-0000-0000-0000-000000000003']::uuid[],
      array['aaaaaaaa-0000-0000-0000-000000000002']::uuid[])$$,
  '22023', 'invalid_assignment', 'vanlig mal med ansvarlig avvises');
select throws_ok(
  $$select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      array['99999999-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000002']::uuid[],
      array['aaaaaaaa-0000-0000-0000-000000000002']::uuid[])$$,
  '22023', 'invalid_assignment', 'listene må ha samme lengde');

-- Annen husstand: RLS stopper innsettingen. (Med et barn derfra stopper valideringen først,
-- fordi RLS skjuler barnet.)
select throws_ok(
  $$select public.activate_templates('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      array['99999999-0000-0000-0000-000000000003']::uuid[])$$,
  '42501', null, 'kan ikke aktivere maler i en annen husstand');

select tests.logout();
set local role anon;
select throws_ok(
  $$select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      array['99999999-0000-0000-0000-000000000003']::uuid[])$$,
  '42501', null, 'anon kan ikke aktivere maler');
select tests.logout();

-- 20261123090000_rename_trash_template.sql
select is(
  (select title || ' / ' || description from public.task_templates where slug = 'routine-kid-trash'),
  'Tømme søppel på kjøkken og bad / Knyt igjen posene på kjøkkenet og badet, bær dem ut og sett i nye poser.',
  'søppelmalen har ny tittel og beskrivelse');

select * from finish();
rollback;
