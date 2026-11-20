-- Tester for beredskapslageret (preparedness_items) og de to årshjulsmalene.
-- Se migrasjonen *_preparedness.sql og docs/DATABASE.md §1, §4 og §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

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
-- Testdata
--   A: voksen A, barn A med enhet (a002), familieskjerm (d001).
--   B: voksen B.
--   C: voksen C med utløpt prøvetid.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000d001', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false),
  ('00000000-0000-0000-0000-00000000c001', 'voksen-c@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'couple', 'apartment', now() + interval '14 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'C', 'single', 'apartment', now() - interval '1 day');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox', null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A',   'owl', 2016, '00000000-0000-0000-0000-00000000a002'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat', null, '00000000-0000-0000-0000-00000000b001'),
  ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C', 'cat', null, '00000000-0000-0000-0000-00000000c001');

insert into public.household_displays (household_id, auth_user_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-00000000d001');

-- Svar som finnes fra før: B har vann.
insert into public.preparedness_items (household_id, item_key, status) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'water', 'have');

-- ===========================================================================
-- 1. Voksen skriver
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select lives_ok(
  $$insert into public.preparedness_items (household_id, item_key, status, expires_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'food', 'have', '2027-03-01')$$,
  'voksen kan legge inn en vare med holdbarhetsdato');

select lives_ok(
  $$insert into public.preparedness_items (household_id, item_key, status, expires_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'food', 'have', '2027-04-01')
    on conflict (household_id, item_key)
    do update set status = excluded.status, expires_on = excluded.expires_on,
                  household_id = excluded.household_id, item_key = excluded.item_key$$,
  'voksen kan oppdatere med upsert (slik PostgREST gjør det)');

select is(
  (select expires_on from public.preparedness_items where item_key = 'food'),
  '2027-04-01'::date, 'upsert gir ny dato');

select lives_ok(
  $$insert into public.preparedness_items (household_id, item_key, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pet_food', 'not_needed')$$,
  'voksen kan merke en vare som «trenger vi ikke»');

select is(
  tests.affected($$update public.preparedness_items set status = null
                   where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and item_key = 'pet_food'$$),
  1, 'voksen kan fjerne et svar (status = null)');

select throws_ok(
  $$delete from public.preparedness_items where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null, 'ingen kan slette rader (ingen delete-rettighet)');

-- Check-constraintene.
select throws_ok(
  $$insert into public.preparedness_items (household_id, item_key, status, expires_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cash_cards', null, '2027-01-01')$$,
  '23514', null, 'holdbarhetsdato uten «har» avvises');

select throws_ok(
  $$insert into public.preparedness_items (household_id, item_key, status, expires_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'first_aid', 'not_needed', '2027-01-01')$$,
  '23514', null, 'holdbarhetsdato på «trenger vi ikke» avvises');

select throws_ok(
  $$insert into public.preparedness_items (household_id, item_key, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vann!', 'have')$$,
  '23514', null, 'ugyldig nøkkel avvises');

-- Annen husstand.
select is((select count(*)::int from public.preparedness_items
           where household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0,
  'voksen A ser ikke B sine varer');

select throws_ok(
  $$insert into public.preparedness_items (household_id, item_key, status)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'food', 'have')$$,
  '42501', null, 'voksen A kan ikke skrive i B');

select is(
  tests.affected($$update public.preparedness_items set status = null
                   where household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$),
  0, 'voksen A kan ikke endre B sine varer');

select throws_ok(
  $$update public.preparedness_items set household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null, 'voksen A kan ikke flytte en vare til B');

-- ===========================================================================
-- 2. Barn leser, skriver ikke
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');

select is((select count(*)::int from public.preparedness_items), 2,
  'barnet ser husstandens varer');

select throws_ok(
  $$insert into public.preparedness_items (household_id, item_key, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'water', 'have')$$,
  '42501', null, 'barnet kan ikke legge inn varer');

select is(
  tests.affected($$update public.preparedness_items set expires_on = null
                   where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$),
  0, 'barnet kan ikke endre varer');

-- ===========================================================================
-- 3. Familieskjermen og ukjente ser ingenting
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');

select is((select count(*)::int from public.preparedness_items), 0,
  'familieskjermen ser ingen varer');

select throws_ok(
  $$insert into public.preparedness_items (household_id, item_key, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'water', 'have')$$,
  '42501', null, 'familieskjermen kan ikke skrive');

select is(
  tests.affected($$update public.preparedness_items set status = null$$),
  0, 'familieskjermen kan ikke endre');

select tests.logout();
set local role anon;
select throws_ok($$select count(*) from public.preparedness_items$$,
  '42501', null, 'anon kan ikke lese');
reset role;

-- ===========================================================================
-- 4. Utløpt prøvetid
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000c001');

select throws_ok(
  $$insert into public.preparedness_items (household_id, item_key, status)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'water', 'have')$$,
  '42501', null, 'utløpt prøvetid: kan ikke legge inn varer');

select tests.logout();
insert into public.preparedness_items (household_id, item_key, status) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'water', 'have');
select tests.login_as('00000000-0000-0000-0000-00000000c001');

select is(
  tests.affected($$update public.preparedness_items set status = null$$),
  0, 'utløpt prøvetid: kan ikke endre varer');

select is((select count(*)::int from public.preparedness_items), 1,
  'utløpt prøvetid: kan fortsatt lese');

-- ===========================================================================
-- 5. Sletting med husstanden
-- ===========================================================================
select tests.logout();
delete from public.households where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select is((select count(*)::int from public.preparedness_items
           where household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0,
  'varene slettes med husstanden');

-- ===========================================================================
-- 6. Malene
-- ===========================================================================
select is(
  (select row(recurrence_type, recurrence_unit, recurrence_every, month, month_day, source_name)::text
   from public.task_templates where slug = 'preparedness-review'),
  '(calendar,year,1,10,,DSB)',
  'gjennomgangen er en månedsoppgave i oktober, med DSB som kilde');

select is(
  (select row(recurrence_type, recurrence_unit, recurrence_every, month, month_day, source_name)::text
   from public.task_templates where slug = 'preparedness-water'),
  '(calendar,year,1,4,,DSB)',
  'vannet er en månedsoppgave i april, med DSB som kilde');

select ok(
  (select description not ilike '%anbefaler%' from public.task_templates where slug = 'preparedness-water'),
  'vannmalen sier ikke at DSB anbefaler å bytte hvert år');

select * from finish();
rollback;
