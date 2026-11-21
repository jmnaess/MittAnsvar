-- Tester for set_completion_status: en voksen endrer godkjenning i ettertid (godkjent ↔ ikke
-- godkjent). Se docs/DATABASE.md §3 og §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

-- ---------------------------------------------------------------------------
-- Testhjelpere (samme som i reward_approval.test.sql)
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
create function tests.status_of(p_name text)
returns public.completion_status language sql security definer as $$
  select c.status from public.task_completions c where c.id = tests.cid(p_name)
$$;

create function tests.due(p_task uuid)
returns date language sql security definer as $$
  select next_due_on from public.tasks where id = p_task
$$;

create function tests.archived(p_task uuid)
returns timestamptz language sql security definer as $$
  select archived_at from public.tasks where id = p_task
$$;

-- godkjent/venter/utbetalt/saldo
create function tests.bal(p_member uuid)
returns text language sql as $$
  select earned_nok || '/' || pending_nok || '/' || paid_nok || '/' || balance_nok
  from public.member_balances where member_id = p_member
$$;

-- Kaller set_completion_status (kortere i testene).
create function tests.set(p_name text, p_status public.completion_status)
returns void language sql as $$
  select public.set_completion_status(tests.cid(p_name), p_status)
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A1 med enhet (a002), barn A2 uten enhet.
--   B: voksen B.
--
-- Oppgaver i A:
--   T1 Rydde rommet   daglig, til A1, 10 kr
--   T2 Henge opp vask engangsjobb, 15 kr
--   T3 Lufte hunden   daglig, til A1, 10 kr (krysses av to ganger)
--   T4 Vaske bilen    engangsjobb, 20 kr (tas av A2 etter avvisning)
--   T5 Uten lønn      daglig, til A1
--   T6 Søppel         daglig, til A1, 10 kr (barnet krysser av: venter)
--   T7 Mate katten    daglig, til A1, 5 kr
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A1',  'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A2',  'bear', 2014, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001');

insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type,
                          recurrence_unit, recurrence_every, reward_nok, job_repeats) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rydde rommet',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Henge opp vask',
   null, 'job', null, null, 15, false),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lufte hunden',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vaske bilen',
   null, 'job', null, null, 20, false),
  ('aaaaaaaa-1111-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Uten lønn',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, null, false),
  ('aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Søppel',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mate katten',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 5, false);

-- Den voksne registrerer for A1: godkjent med én gang.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select tests.complete('t1',  'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t2',  'aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t3a', 'aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t3b', 'aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t4',  'aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t5',  'aaaaaaaa-1111-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t7',  'aaaaaaaa-1111-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.logout();

-- Barnet krysser av på egen enhet: venter.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select tests.complete('t6', 'aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.logout();

-- t1 ble gjort for to dager siden, og t3a for fem dager siden (før t3b). Da kan vi se at
-- fristen regnes fra dagen oppgaven ble gjort, og at en eldre avkrysning ikke flytter fristen.
update public.task_completions
set completed_on = private.household_today(household_id) - 2,
    completed_at = completed_at - interval '2 days'
where id = tests.cid('t1');
update public.task_completions
set completed_on = private.household_today(household_id) - 5,
    due_on       = private.household_today(household_id) - 5,
    completed_at = completed_at - interval '5 days'
where id = tests.cid('t3a');

-- Godkjent: 10 + 15 + 10 + 10 + 20 + 5 = 70. Venter: t6 10.

-- ===========================================================================
-- 1. Hvem kan endre
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select throws_ok($$select tests.set('t1', 'rejected')$$, 'P0001', 'not_adult',
  'barnet kan ikke endre status');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok($$select tests.set('t1', 'rejected')$$, 'P0001', 'not_adult',
  'en voksen i en annen husstand kan ikke endre status');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.set_completion_status(gen_random_uuid(), 'rejected')$$,
  'P0001', 'not_adult', 'ukjent id gir samme feil som en annen husstand');
select tests.logout();

select set_config('role', 'anon', true);
select throws_ok($$select public.set_completion_status(gen_random_uuid(), 'rejected')$$,
  '42501', null, 'anon kan ikke kalle set_completion_status');
select tests.logout();

select is(tests.status_of('t1'), 'approved'::public.completion_status, 't1 er fortsatt godkjent');

-- ===========================================================================
-- 2. Hva som ikke kan endres
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select tests.set('t6', 'rejected')$$, 'P0001', 'status_not_changeable',
  'en ventende avkrysning håndteres som før, ikke her');
select throws_ok($$select tests.set('t1', 'approved')$$, 'P0001', 'status_not_changeable',
  'kan ikke endre til samme status');
select throws_ok($$select tests.set('t1', 'pending')$$, 'P0001', 'status_not_changeable',
  'kan ikke endre tilbake til venter');
select throws_ok($$select tests.set('t5', 'rejected')$$, 'P0001', 'status_not_changeable',
  'en avkrysning uten lønn kan ikke endres');

-- ===========================================================================
-- 3. Godkjent → ikke godkjent (samme regler som reject_completion)
-- ===========================================================================
-- Siste avkrysning på en gjentakende oppgave: fristen settes tilbake.
select lives_ok($$select tests.set('t1', 'rejected')$$, 'en voksen kan endre til ikke godkjent');
select is(tests.status_of('t1'), 'rejected'::public.completion_status, 't1 er ikke godkjent');
select is(tests.due('aaaaaaaa-1111-0000-0000-000000000001'),
  (select due_on from public.task_completions where id = tests.cid('t1')),
  'siste avkrysning: fristen er satt tilbake');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '60/10/0/60',
  'beløpet er trukket fra saldoen');

-- Ikke siste: bare statusen endres.
select lives_ok($$select tests.set('t3a', 'rejected')$$, 'en eldre avkrysning kan endres');
select is(tests.due('aaaaaaaa-1111-0000-0000-000000000003'),
  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 1,
  'ikke siste: fristen står (i morgen, fra t3b)');

-- Engangsjobb, siste avkrysning: blir ledig igjen.
select lives_ok($$select tests.set('t2', 'rejected')$$, 'en engangsjobb kan endres');
select is(tests.archived('aaaaaaaa-1111-0000-0000-000000000002'), null,
  'engangsjobben er ledig igjen');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '35/10/0/35',
  'saldo etter tre endringer: 70 − 10 − 10 − 15');

-- ===========================================================================
-- 4. Ikke godkjent → godkjent
-- ===========================================================================
-- Siste avkrysning: fristen flyttes fram, regnet fra dagen oppgaven ble gjort (i forgårs).
select lives_ok($$select tests.set('t1', 'approved')$$, 'en voksen kan endre til godkjent');
select is(tests.status_of('t1'), 'approved'::public.completion_status, 't1 er godkjent igjen');
select is(tests.due('aaaaaaaa-1111-0000-0000-000000000001'),
  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') - 1,
  'siste avkrysning: fristen er flyttet fram fra dagen den ble gjort (i går)');

-- Ikke siste: fristen står. (Feil her ville gitt fem dager siden + 1.)
select lives_ok($$select tests.set('t3a', 'approved')$$, 'en eldre avkrysning kan godkjennes igjen');
select is(tests.due('aaaaaaaa-1111-0000-0000-000000000003'),
  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 1,
  'ikke siste: fristen står');

-- Engangsjobb som fortsatt er ledig: arkiveres igjen.
select lives_ok($$select tests.set('t2', 'approved')$$, 'en ledig engangsjobb kan godkjennes igjen');
select isnt(tests.archived('aaaaaaaa-1111-0000-0000-000000000002'), null,
  'engangsjobben er arkivert igjen');
select tests.logout();
select ok(not exists (select 1 from public.today_tasks where id = 'aaaaaaaa-1111-0000-0000-000000000002'),
  'engangsjobben er borte fra «Ledige jobber»');

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '70/10/0/70',
  'beløpene teller igjen');

-- Engangsjobb som er tatt av en annen etterpå: bare statusen endres.
select lives_ok($$select tests.set('t4', 'rejected')$$, 'engangsjobben t4 endres til ikke godkjent');
select is(tests.archived('aaaaaaaa-1111-0000-0000-000000000004'), null, 't4 er ledig igjen');
select tests.complete('t4-a2', 'aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003');
select tests.logout();
-- Fast tidspunkt, så vi ser at det ikke endres (now() er likt i hele transaksjonen).
update public.tasks set archived_at = '2026-01-01 12:00+00'
where id = 'aaaaaaaa-1111-0000-0000-000000000004';

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select tests.set('t4', 'approved')$$, 'engangsjobb tatt av en annen kan godkjennes');
select is(tests.status_of('t4'), 'approved'::public.completion_status, 't4 er godkjent');
select is(tests.archived('aaaaaaaa-1111-0000-0000-000000000004'), '2026-01-01 12:00+00'::timestamptz,
  'tatt av en annen: oppgaven er urørt');

-- ===========================================================================
-- 5. Utbetalt beløp kan trekkes tilbake, og gir forskudd
-- ===========================================================================
select lives_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 60)$$,
  'utbetaling av 60');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '70/10/60/10', '10 igjen å betale ut');
select lives_ok($$select tests.set('t4', 'rejected')$$,
  '20 kr kan trekkes når bare 10 er igjen');
select is(tests.status_of('t4'), 'rejected'::public.completion_status, 't4 er ikke godkjent');
select lives_ok($$select tests.set('t3b', 'rejected')$$, 'også t3b kan trekkes');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '40/10/60/-20', 'forskudd på 20 kr');
select lives_ok($$select tests.set('t7', 'rejected')$$, 'kan trekkes også med forskudd');
select tests.logout();

-- ===========================================================================
-- 6. Barnet ser den nye statusen
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select is((select status from public.task_completions where id = tests.cid('t3b')),
  'rejected'::public.completion_status, 'barnet ser at t3b ikke er godkjent');
select is((select status from public.task_completions where id = tests.cid('t1')),
  'approved'::public.completion_status, 'barnet ser at t1 er godkjent igjen');
select tests.logout();

select * from finish();
rollback;
