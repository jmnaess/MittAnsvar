-- Tester for remove_completion («Ikke gjort») og reassign_completion («Endre hvem som gjorde
-- det»): en voksen retter dagens avkrysninger i «I dag». Se docs/DATABASE.md §3. Alt rulles
-- tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

-- ---------------------------------------------------------------------------
-- Testhjelpere (samme som i change_completion_status.test.sql)
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

create table tests.res (name text primary key, completion_id uuid);
grant all on tests.res to authenticated;

-- Frister lagret underveis, så vi kan se at de settes tilbake (eller ikke endres).
create table tests.saved (name text primary key, d date);

create function tests.complete(p_name text, p_task uuid, p_member uuid)
returns void language plpgsql as $$
begin
  insert into tests.res
  select p_name, r.completion_id from public.complete_task(p_task, p_member) r;
end;
$$;

create function tests.cid(p_name text)
returns uuid language sql as $$ select completion_id from tests.res where name = p_name $$;

-- Lest som postgres (uten RLS).
create function tests.due(p_task uuid)
returns date language sql security definer as $$
  select next_due_on from public.tasks where id = p_task
$$;

create function tests.save_due(p_name text, p_task uuid)
returns void language sql security definer as $$
  insert into tests.saved values (p_name, tests.due(p_task))
$$;

create function tests.saved_due(p_name text)
returns date language sql security definer as $$ select d from tests.saved where name = p_name $$;

create function tests.archived(p_task uuid)
returns timestamptz language sql security definer as $$
  select archived_at from public.tasks where id = p_task
$$;

create function tests.exists_c(p_name text)
returns boolean language sql security definer as $$
  select exists (select 1 from public.task_completions where id = tests.cid(p_name))
$$;

-- hvem/beløp/status/registrert av, f.eks. «A2/20/approved/a001»
create function tests.row_of(p_name text)
returns text language sql security definer as $$
  select m.display_name || '/' || coalesce(c.reward_nok::text, '-') || '/' || c.status
         || '/' || right(c.recorded_by::text, 4)
  from public.task_completions c
  join public.members m on m.id = c.completed_by_member_id
  where c.id = tests.cid(p_name)
$$;

create function tests.remove(p_name text)
returns void language sql as $$ select public.remove_completion(tests.cid(p_name)) $$;

create function tests.move(p_name text, p_member uuid)
returns void language sql as $$ select public.reassign_completion(tests.cid(p_name), p_member) $$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A1 med enhet (a002), barn A2 uten enhet.
--   B: voksen B.
--
-- Oppgaver i A:
--   T1  Rydde rommet   daglig, til A1, 10 kr      (fjernes: siste)
--   T2  Lufte hunden   daglig, til A1, 10 kr      (krysses av to ganger, eldste fjernes)
--   T3  Henge opp vask engangsjobb, 15 kr         (fjernes: blir ledig igjen)
--   T4  Mate katten    daglig, til A1, 5 kr       (betales ut)
--   T5  Støvsuge       daglig, til voksen A, 20 kr (voksen → A2)
--   T6  Søppel         daglig, til A1, 10 kr      (barnet krysser av: venter)
--   T7  Vaske bilen    engangsjobb bare for A2, 8 kr
--   T8  Bære ved       daglig, til A1, 10 kr      (prisen endres etterpå, så A1 → A2)
--   T9  Vanne blomster daglig, til A1             (gjort i går)
--   T10 Kaste papp     daglig, til A1, 10 kr      (barnet krysser av, voksen avviser)
--   T11 Re sengen      daglig, til A1, 6 kr       (A1 → voksen)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'A',  'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'A1', 'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'A2', 'bear', 2014, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'B',  'cat',  null, '00000000-0000-0000-0000-00000000b001');

insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type,
                          recurrence_unit, recurrence_every, reward_nok, job_repeats) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rydde rommet',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lufte hunden',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Henge opp vask',
   null, 'job', null, null, 15, false),
  ('aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mate katten',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 5, false),
  ('aaaaaaaa-1111-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Støvsuge',
   'aaaaaaaa-0000-0000-0000-000000000001', 'interval', 'day', 1, 20, false),
  ('aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Søppel',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bære ved',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vanne blomster',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, null, false),
  ('aaaaaaaa-1111-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kaste papp',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Re sengen',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 6, false);

insert into public.tasks (id, household_id, title, recurrence_type, reward_nok, job_repeats,
                          job_member_ids) values
  ('aaaaaaaa-1111-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vaske bilen',
   'job', 8, false, array['aaaaaaaa-0000-0000-0000-000000000003'::uuid]);

select tests.save_due('t1_before', 'aaaaaaaa-1111-0000-0000-000000000001');

-- Den voksne registrerer: godkjent med én gang.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select tests.complete('t1',  'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t2a', 'aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t2b', 'aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t3',  'aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t4',  'aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t5',  'aaaaaaaa-1111-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001');
select tests.complete('t7',  'aaaaaaaa-1111-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000003');
select tests.complete('t8',  'aaaaaaaa-1111-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t9',  'aaaaaaaa-1111-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t11', 'aaaaaaaa-1111-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.logout();

-- Barnet krysser av på egen enhet: venter.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select tests.complete('t6',  'aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t10', 'aaaaaaaa-1111-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select public.reject_completion(tests.cid('t10'));
select tests.logout();

-- t9 ble gjort i går.
update public.task_completions
set completed_on = private.household_today(household_id) - 1,
    completed_at = completed_at - interval '1 day'
where id = tests.cid('t9');

-- ===========================================================================
-- 1. Hvem kan rette
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select throws_ok($$select tests.remove('t6')$$, 'P0001', 'not_adult',
  'barnet kan ikke fjerne, heller ikke sin egen');
select throws_ok($$select tests.move('t6', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'P0001', 'not_adult', 'barnet kan ikke flytte');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok($$select tests.remove('t1')$$, 'P0001', 'not_adult',
  'en voksen i en annen husstand kan ikke fjerne');
select throws_ok($$select tests.move('t1', 'bbbbbbbb-0000-0000-0000-000000000001')$$,
  'P0001', 'not_adult', 'en voksen i en annen husstand kan ikke flytte');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.remove_completion(gen_random_uuid())$$, 'P0001', 'not_adult',
  'ukjent id gir samme feil som en annen husstand');
select tests.logout();

select set_config('role', 'anon', true);
select throws_ok($$select public.remove_completion(gen_random_uuid())$$, '42501', null,
  'anon kan ikke kalle remove_completion');
select throws_ok($$select public.reassign_completion(gen_random_uuid(), gen_random_uuid())$$,
  '42501', null, 'anon kan ikke kalle reassign_completion');
select tests.logout();

select ok(tests.exists_c('t1') and tests.exists_c('t6'), 'ingenting er fjernet');

-- ===========================================================================
-- 2. Bare i dag, ikke avviste
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select tests.remove('t9')$$, 'P0001', 'not_today',
  'en avkrysning fra i går kan ikke fjernes');
select throws_ok($$select tests.move('t9', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'P0001', 'not_today', 'en avkrysning fra i går kan ikke flyttes');
select throws_ok($$select tests.remove('t10')$$, 'P0001', 'completion_not_found',
  'en avvist avkrysning kan ikke fjernes');
select throws_ok($$select tests.move('t10', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'P0001', 'completion_not_found', 'en avvist avkrysning kan ikke flyttes');

-- ===========================================================================
-- 3. «Ikke gjort»
-- ===========================================================================
select lives_ok($$select tests.remove('t1')$$, 'fjerner siste avkrysning, uten tidsgrense');
select ok(not tests.exists_c('t1'), 'raden er slettet');
select is(tests.due('aaaaaaaa-1111-0000-0000-000000000001'), tests.saved_due('t1_before'),
  'fristen er satt tilbake');

select tests.save_due('t2_after', 'aaaaaaaa-1111-0000-0000-000000000002');
select lives_ok($$select tests.remove('t2a')$$, 'fjerner en avkrysning som ikke er den siste');
select ok(not tests.exists_c('t2a') and tests.exists_c('t2b'), 'bare den eldste er slettet');
select is(tests.due('aaaaaaaa-1111-0000-0000-000000000002'), tests.saved_due('t2_after'),
  'fristen er uendret når det finnes en nyere avkrysning');

select isnt(tests.archived('aaaaaaaa-1111-0000-0000-000000000003'), null,
  'engangsjobben er arkivert etter avkrysning');
select lives_ok($$select tests.remove('t3')$$, 'fjerner engangsjobben');
select is(tests.archived('aaaaaaaa-1111-0000-0000-000000000003'), null,
  'engangsjobben er ledig igjen');

-- ===========================================================================
-- 4. «Endre hvem»
-- ===========================================================================
select tests.save_due('t5_after', 'aaaaaaaa-1111-0000-0000-000000000005');
select lives_ok($$select tests.move('t5', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'flytter fra voksen til barn');
select is(tests.row_of('t5'), 'A2/20/approved/a001',
  'barnet får oppgavens beløp, godkjent, registrert av den voksne');
select is(tests.due('aaaaaaaa-1111-0000-0000-000000000005'), tests.saved_due('t5_after'),
  'fristen endres ikke ved flytting');

select lives_ok($$select tests.move('t11', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'flytter fra barn til voksen');
select is(tests.row_of('t11'), 'A/-/approved/a001', 'den voksne får ingen lønn');

-- Prisen endres etter avkrysning: beløpet på avkrysningen følger med, ikke den nye prisen.
update public.tasks set reward_nok = 50 where id = 'aaaaaaaa-1111-0000-0000-000000000008';
select lives_ok($$select tests.move('t8', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'flytter fra barn til barn etter prisendring');
select is(tests.row_of('t8'), 'A2/10/approved/a001',
  'det nye barnet får beløpet som ble lagret, ikke den nye prisen');

select throws_ok($$select tests.move('t7', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'P0001', 'invalid_member', 'en jobb kan ikke flyttes til et barn utenfor lista');
select throws_ok($$select tests.move('t7', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'P0001', 'invalid_member', 'en jobb kan ikke flyttes til en voksen');
select throws_ok($$select tests.move('t2b', 'bbbbbbbb-0000-0000-0000-000000000001')$$,
  'P0001', 'invalid_member', 'kan ikke flytte til et medlem i en annen husstand');
select is(tests.row_of('t7'), 'A2/8/approved/a001', 'jobben står uendret');

-- ===========================================================================
-- 5. Utbetalt beløp
--   A1 har igjen godkjent: t2b 10 + t4 5 = 15. Betal ut alt.
-- ===========================================================================
select lives_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 15)$$,
  'betaler ut hele saldoen til A1');
select throws_ok($$select tests.remove('t4')$$, 'P0001', 'reward_already_paid',
  'kan ikke fjerne et beløp som er betalt ut');
select throws_ok($$select tests.move('t4', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'P0001', 'reward_already_paid', 'kan ikke flytte et utbetalt beløp til en voksen');
select throws_ok($$select tests.move('t4', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'P0001', 'reward_already_paid', 'kan ikke flytte et utbetalt beløp til et annet barn');
select lives_ok($$select tests.remove('t6')$$,
  'en ventende avkrysning kan fjernes selv om saldoen er 0');
select tests.logout();

select * from finish();
rollback;
