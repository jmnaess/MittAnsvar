-- Tester for task_templates, activate_templates og månedsoppgaver i today_tasks.
-- Se docs/DATABASE.md §2 og §4. Alt rulles tilbake.
--
-- Rene datotester for månedsskifte og årsskifte ligger i compute_next_due.test.sql. Her testes
-- det som avhenger av «i dag» (now()), med testmaler for denne og forrige måned, så testene
-- virker uansett hvilken dag de kjøres.
begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

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

grant execute on all functions in schema tests to anon, authenticated;

-- I dag, den 1. i denne måneden og den 1. i forrige måned (i Oslo).
create table tests.d as
with x as (select private.local_today('Europe/Oslo') as today)
select today,
       today - (extract(day from today)::int - 1)                     as month_start,
       extract(month from today)::smallint                            as this_month,
       (today - extract(day from today)::int)
         - (extract(day from today - extract(day from today)::int)::int - 1) as prev_month_start
from x;
alter table tests.d add column prev_month smallint;
update tests.d set prev_month = extract(month from prev_month_start)::smallint;
grant select on tests.d to authenticated;

create table tests.res (name text, completion_id uuid, feedback_text text, next_due_on date);
grant all on tests.res to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: enebolig, familie, tone fact. Voksen A og barn A med enhet.
--   B: leilighet. Voksen B.
--   C: utløpt prøvetid.
--   F: innlogget uten medlemskap.
--   Testmaler: én for denne måneden (kjøkken), én for forrige måned, én inaktiv.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000a002', null),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com'),
  ('00000000-0000-0000-0000-00000000c001', 'voksen-c@example.com'),
  ('00000000-0000-0000-0000-00000000f001', 'fremmed@example.com');

insert into public.households (id, name, type, housing_type, feedback_tone, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     'fact', now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'couple', 'apartment', 'both', now() + interval '14 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'C', 'single', 'apartment', 'both', now() - interval '1 day');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox', null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A',   'owl', 2016, '00000000-0000-0000-0000-00000000a002'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat', null, '00000000-0000-0000-0000-00000000b001'),
  ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C', 'cat', null, '00000000-0000-0000-0000-00000000c001');

insert into public.task_templates
  (id, slug, title, description, category, recurrence_type, recurrence_unit, recurrence_every, month, month_day, is_active)
select '99999999-0000-0000-0000-000000000001'::uuid, 'test-this-month', 'Denne måneden', 'Test', 'kitchen',
       'calendar'::public.recurrence_type, 'year'::public.recurrence_unit, 1, this_month, null::smallint, true from tests.d
union all
select '99999999-0000-0000-0000-000000000002', 'test-prev-month', 'Forrige måned', 'Test', 'other',
       'calendar', 'year', 1, prev_month, null, true from tests.d
union all
select '99999999-0000-0000-0000-000000000003', 'test-inactive', 'Inaktiv', 'Test', 'other',
       'calendar', 'year', 1, 1, null, false;

create function tests.tpl(p_slug text)
returns uuid language sql stable as $$
  select id from public.task_templates where slug = p_slug
$$;
grant execute on function tests.tpl(text) to authenticated;

-- ===========================================================================
-- 1. Malene kan leses, men ikke endres
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select is((select count(*)::int from public.task_templates where slug not like 'test-%'), 25,
  'startsettet har 25 maler (22 + 3 fra *_adjust_task_templates.sql)');
select is((select count(*)::int from public.task_templates where slug = 'test-inactive'), 0,
  'inaktive maler vises ikke');
select is((select count(*)::int from public.task_templates
           where slug not like 'test-%' and month_day is null), 24,
  '24 av malene er månedsoppgaver');
select ok((select description like '%frostsikker utekran%' from public.task_templates
           where slug = 'outdoor-tap-close'),
  'justert forklaring er lagt inn (finnes på slug)');
select is((select month_day from public.task_templates where slug = 'smoke-alarms'), 1::smallint,
  'røykvarslerne har fast dato 1. desember');
select is((select housing_types::text from public.task_templates where slug = 'gutters-autumn'),
  '{townhouse,house}', '«hus»-maler gjelder rekkehus og enebolig');
select is((select household_types::text from public.task_templates where slug = 'school-start'),
  '{family}', 'barnemaler gjelder bare familier');

select throws_ok(
  $$insert into public.task_templates (slug, title, description, category, recurrence_type)
    values ('egen', 'Egen', 'Egen', 'other', 'once')$$,
  '42501', null, 'klienten kan ikke lage maler');
select throws_ok($$update public.task_templates set title = 'Endret'$$,
  '42501', null, 'klienten kan ikke endre maler');
select throws_ok($$delete from public.task_templates$$,
  '42501', null, 'klienten kan ikke slette maler');

select tests.logout();
set local role anon;
select throws_ok($$select count(*) from public.task_templates$$,
  '42501', null, 'anon kan ikke lese maler');
select tests.logout();

-- ===========================================================================
-- 2. Aktivering
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select is(public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            array[tests.tpl('test-this-month'), tests.tpl('fridge-deep-clean')]),
  2, 'voksen aktiverer to maler');

select results_eq(
  $$select title, description, category, recurrence_type::text, recurrence_unit::text,
           recurrence_every::int, month::int, month_day::int
    from public.tasks where template_id = tests.tpl('fridge-deep-clean')$$,
  $$values ('Vask kjøleskapet grundig'::text,
            (select description from public.task_templates where slug = 'fridge-deep-clean'),
            'kitchen'::text, 'calendar'::text, 'year'::text, 1, 1, null::int)$$,
  'aktiveringen kopierer tittel, forklaring, kategori og gjentakelse fra malen');
select is((select created_by from public.tasks where template_id = tests.tpl('test-this-month')),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'triggeren setter created_by som for andre oppgaver');

select is((select next_due_on from public.tasks where template_id = tests.tpl('test-this-month')),
  (select month_start from tests.d), 'mal for denne måneden: frist er den 1. i denne måneden');
select results_eq(
  $$select is_month_task, is_overdue, due_by = (month_start + interval '1 month')::date - 1
    from public.today_tasks, tests.d where template_id = tests.tpl('test-this-month')$$,
  $$values (true, false, true)$$,
  'mal for denne måneden står i today_tasks som månedsoppgave, ikke forfalt, frist siste dag i måneden');

select is(public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            array[tests.tpl('test-this-month'), tests.tpl('smoke-alarms')]),
  1, 'en mal som allerede er aktiv, hoppes over');
select is((select count(*)::int from public.tasks where template_id = tests.tpl('test-this-month')), 1,
  'samme mal gir bare én oppgave');
select throws_ok(
  $$insert into public.tasks (household_id, template_id, title, recurrence_type)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', tests.tpl('test-this-month'), 'Kopi', 'once')$$,
  '23505', null, 'direkte insert av en aktiv mal avvises');
select is(public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array[tests.tpl('test-inactive')]),
  0, 'inaktive maler kan ikke aktiveres');
select is(public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{}'), 0,
  'tom liste gir ingen oppgaver');

-- Deaktivering = arkivering. Da kan malen aktiveres igjen, som en ny oppgave.
update public.tasks set archived_at = now() where template_id = tests.tpl('test-this-month');
select is(public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array[tests.tpl('test-this-month')]),
  1, 'en deaktivert mal kan aktiveres igjen');
select is((select count(*)::int from public.tasks
           where template_id = tests.tpl('test-this-month') and archived_at is null), 1,
  'etter ny aktivering finnes én aktiv oppgave for malen');

-- ===========================================================================
-- 3. Hvem kan aktivere
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array[tests.tpl('roof-check')])$$,
  '42501', null, 'barn kan ikke aktivere maler');

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok(
  $$select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array[tests.tpl('roof-check')])$$,
  '42501', null, 'voksen B kan ikke aktivere maler i husstand A');
select is((select count(*)::int from public.tasks), 0, 'voksen B ser ingen av A sine maloppgaver');

select tests.login_as('00000000-0000-0000-0000-00000000c001');
select throws_ok(
  $$select public.activate_templates('cccccccc-cccc-cccc-cccc-cccccccccccc', array[tests.tpl('roof-check')])$$,
  '42501', null, 'utløpt prøvetid: kan ikke aktivere maler');

select tests.login_as('00000000-0000-0000-0000-00000000f001');
select throws_ok(
  $$select public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array[tests.tpl('roof-check')])$$,
  '42501', null, 'bruker uten medlemskap kan ikke aktivere maler');

-- ===========================================================================
-- 4. Avkrysning, tilbakemelding og angring av en månedsoppgave
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

insert into tests.res
select 'month', r.completion_id, r.feedback_text, r.next_due_on
from public.complete_task(
  (select id from public.tasks where template_id = tests.tpl('test-this-month') and archived_at is null),
  'aaaaaaaa-0000-0000-0000-000000000001') r;

select is((select next_due_on from tests.res where name = 'month'),
  (select (month_start + interval '1 year')::date from tests.d),
  'utført månedsoppgave: neste frist er samme måned neste år');
select is((select count(*)::int from public.today_tasks where template_id = tests.tpl('test-this-month')), 0,
  'utført månedsoppgave forsvinner fra today_tasks');
select is((select feedback_text from tests.res where name = 'month'),
  'Visste du at en fuktig kjøkkenklut bør vaskes eller byttes ofte, fordi bakterier trives i den?',
  'kategorien fra malen gir kjøkkenteksten (tone fact)');
select is((select due_on from public.task_completions
           where id = (select completion_id from tests.res where name = 'month')),
  (select month_start from tests.d), 'avkrysningen husker fristen den dekket (den 1. i måneden)');

select lives_ok(
  $$select public.undo_completion((select completion_id from tests.res where name = 'month'))$$,
  'avkrysningen kan angres');
select is((select next_due_on from public.tasks
           where template_id = tests.tpl('test-this-month') and archived_at is null),
  (select month_start from tests.d), 'angring: fristen er tilbake til den 1. i denne måneden');
select is((select is_overdue from public.today_tasks where template_id = tests.tpl('test-this-month')),
  false, 'angring: oppgaven står i «Denne måneden» igjen, ikke forfalt');

-- ===========================================================================
-- 5. Månedsoppgave fra forrige måned er forfalt
-- ===========================================================================
select is(public.activate_templates('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array[tests.tpl('test-prev-month')]),
  1, 'mal for forrige måned kan aktiveres');
select is((select next_due_on from public.tasks where template_id = tests.tpl('test-prev-month')),
  (select (prev_month_start + interval '1 year')::date from tests.d),
  'mal for forrige måned: første frist er neste år');

select tests.logout();
update public.tasks set next_due_on = (select prev_month_start from tests.d)
  where template_id = tests.tpl('test-prev-month');
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is((select is_overdue from public.today_tasks where template_id = tests.tpl('test-prev-month')),
  true, 'månedsoppgave fra forrige måned er forfalt');

select * from finish();
rollback;
