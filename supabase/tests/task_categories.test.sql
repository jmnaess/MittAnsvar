-- Tester for de nye kategoriene (se *_task_categories.sql): mappingen av eksisterende data,
-- de nye check-constraintene, og at voksne kan velge og endre kategori. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

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
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ===========================================================================
-- 1. Mappingen: ingen gamle verdier igjen, og malene som er flyttet på slug
-- ===========================================================================
select is((select count(*)::int from public.task_templates
           where category in ('daily', 'cleaning', 'safety')), 0,
  'ingen maler har gamle kategorier');
select is((select count(*)::int from public.tasks
           where category in ('daily', 'cleaning', 'safety')), 0,
  'ingen oppgaver har gamle kategorier');
select is((select count(*)::int from public.feedback_messages
           where category in ('daily', 'cleaning', 'safety')), 0,
  'ingen tilbakemeldingstekster har gamle kategorier');
select is((select array_agg(category order by slug) from public.task_templates
           where slug in ('summer-tyres', 'winter-tyres', 'car-wash-spring', 'car-winter-ready')),
  array['car', 'car', 'car', 'car'], 'bilmalene ligger i car');
select is((select category from public.task_templates where slug = 'smoke-alarms'),
  'maintenance', 'safety er blitt maintenance');
select is((select category from public.task_templates where slug = 'dust-heaters'),
  'tidying', 'cleaning er blitt tidying');
select is((select category from public.task_templates where slug = 'windows-outside'),
  'outdoor', 'vinduer ute ligger i outdoor');
select is((select category from public.task_templates where slug = 'kids-clothes-summer'),
  'laundry', 'barneklær ligger i laundry');

-- ===========================================================================
-- 2. Constraintene
-- ===========================================================================
select throws_ok(
  $$insert into public.task_templates (slug, title, description, category, recurrence_type)
    values ('test-safety', 'Test', 'Test', 'safety', 'once')$$,
  '23514', null, 'mal med gammel kategori avvises');
select throws_ok(
  $$insert into public.feedback_messages (tone, category, text) values ('fact', 'cleaning', 'Test-tekst')$$,
  '23514', null, 'tilbakemeldingstekst med gammel kategori avvises');

-- ---------------------------------------------------------------------------
-- Testdata: husstand A med én voksen
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'couple', 'house', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',
   '00000000-0000-0000-0000-00000000a001');

select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- ===========================================================================
-- 3. Voksen velger og endrer kategori
-- ===========================================================================
select lives_ok(
  $$insert into public.tasks (household_id, title, category, recurrence_type)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mate katten', 'pets', 'once')$$,
  'voksen kan lage en oppgave med kategorien pets');
select throws_ok(
  $$insert into public.tasks (household_id, title, category, recurrence_type)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Gammel', 'safety', 'once')$$,
  '23514', null, 'oppgave med gammel kategori avvises');
select lives_ok(
  $$insert into public.tasks (household_id, title, recurrence_type)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Uten kategori', 'once')$$,
  'voksen kan lage en oppgave uten kategori');
select is((select category from public.tasks where title = 'Uten kategori'),
  'other', 'standard er other');

update public.tasks set category = 'car' where title = 'Uten kategori';
select is((select category from public.tasks where title = 'Uten kategori'),
  'car', 'voksen kan endre kategori');

-- ===========================================================================
-- 4. Oppgave fra mal får malens kategori
-- ===========================================================================
select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  array[(select id from public.task_templates where slug = 'winter-tyres')]);
select is((select category from public.tasks
           where template_id = (select id from public.task_templates where slug = 'winter-tyres')),
  'car', 'oppgave fra bilmal ligger i car');

select * from finish();
rollback;
