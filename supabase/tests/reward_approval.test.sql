-- Tester for steg 10b: godkjenning av lønn (status på avkrysninger, approve_completions,
-- reject_completion, saldo og utbetaling). Se docs/DATABASE.md §3 og §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(45);

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

grant execute on all functions in schema tests to anon, authenticated;

create table tests.res (name text primary key, completion_id uuid,
                        status public.completion_status, reward_nok integer);
grant all on tests.res to authenticated;

-- Kaller complete_task og lagrer resultatet under et navn.
create function tests.complete(p_name text, p_task uuid, p_member uuid)
returns void language plpgsql as $$
begin
  insert into tests.res
  select p_name, r.completion_id, r.status, r.reward_nok
  from public.complete_task(p_task, p_member) r;
end;
$$;

create function tests.cid(p_name text)
returns uuid language sql as $$ select completion_id from tests.res where name = p_name $$;

-- Status lest som postgres (uten RLS).
create function tests.status_of(p_name text)
returns public.completion_status language sql security definer as $$
  select c.status from public.task_completions c where c.id = tests.cid(p_name)
$$;

create function tests.bal(p_member uuid)
returns text language sql as $$
  select earned_nok || '/' || pending_nok || '/' || paid_nok || '/' || balance_nok
  from public.member_balances where member_id = p_member
$$;

grant execute on all functions in schema tests to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A1 med enhet (a002).
--   B: voksen B, barn B med enhet (b002).
--
-- Oppgaver i A (alle med lønn unntatt «Uten lønn»):
--   T1 Rydde rommet   daglig, til A1, 10 kr
--   T2 Henge opp vask engangsjobb, 15 kr
--   T3 Uten lønn      daglig, til A1
--   T4 Oppvask        gjentakende jobb, 5 kr
--   T5 Støvsuge       daglig, til A1, 10 kr (registreres av en voksen)
--   T6 Lufte hunden   daglig, til A1, 10 kr (krysses av to ganger)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false),
  ('00000000-0000-0000-0000-00000000b002', null, true);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A1',  'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'bear', 2015, '00000000-0000-0000-0000-00000000b002');

insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type,
                          recurrence_unit, recurrence_every, reward_nok, job_repeats) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rydde rommet',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Henge opp vask',
   null, 'job', null, null, 15, false),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Uten lønn',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, null, false),
  ('aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Oppvask',
   null, 'job', null, null, 5, true),
  ('aaaaaaaa-1111-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Støvsuge',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false),
  ('aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lufte hunden',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false);

-- ===========================================================================
-- 1. Status ved avkrysning
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select tests.complete('t1', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t2', 'aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t3', 'aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t4a', 'aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t4b', 'aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t6a', 'aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t6b', 'aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.logout();

select is((select status from tests.res where name = 't1'), 'pending'::public.completion_status,
  'barnet krysser av med lønn på egen enhet: venter');
select is((select status from tests.res where name = 't3'), 'approved'::public.completion_status,
  'barnet krysser av uten lønn: godkjent med én gang');

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select tests.complete('t5', 'aaaaaaaa-1111-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('t5-voksen', 'aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001');
select tests.logout();

select is((select status || ' ' || reward_nok from tests.res where name = 't5'), 'approved 10',
  'en voksen registrerer for barnet: godkjent med én gang, med lønn');
select is((select status from tests.res where name = 't5-voksen'), 'approved'::public.completion_status,
  'en voksen krysser av for seg selv: godkjent');

-- ===========================================================================
-- 2. Saldo: venter teller med, men kan ikke betales ut
--    Godkjent: t5 = 10. Venter: t1 10 + t2 15 + t4a 5 + t4b 5 + t6a 10 + t6b 10 = 55.
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '10/55/0/10',
  'barnet ser saldoen øke med én gang: 10 godkjent, 55 venter');
select is((select status from public.task_completions where id = tests.cid('t1')),
  'pending'::public.completion_status, 'barnet ser at avkrysningen venter');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '10/55/0/10',
  'den voksne ser samme saldo');
-- Over godkjent saldo er lov (forskudd), se extra_rewards_and_advances.test.sql.
select throws_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 10001)$$,
  'P0001', 'invalid_amount', 'utbetaling over 10 000 kr avvises');
select lives_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 10)$$,
  'utbetaling av hele den godkjente saldoen går');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '10/55/10/0',
  'etter utbetaling: 0 kan betales ut, 55 venter fortsatt');
select tests.logout();

-- ===========================================================================
-- 3. Hvem kan godkjenne og avvise
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select throws_ok(format('select public.approve_completions(array[%L]::uuid[])', tests.cid('t1')),
  'P0001', 'not_adult', 'barnet kan ikke godkjenne');
select throws_ok(format('select public.reject_completion(%L)', tests.cid('t1')),
  'P0001', 'not_adult', 'barnet kan ikke avvise');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok(format('select public.approve_completions(array[%L]::uuid[])', tests.cid('t1')),
  'P0001', 'not_adult', 'en voksen i en annen husstand kan ikke godkjenne');
select throws_ok(format('select public.reject_completion(%L)', tests.cid('t1')),
  'P0001', 'not_adult', 'en voksen i en annen husstand kan ikke avvise');
select is((select count(*)::int from public.task_completions), 0,
  'en annen husstand ser ingen avkrysninger');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.approve_completions(array[gen_random_uuid()])$$,
  'P0001', 'not_adult', 'ukjent id gir samme feil som en annen husstand');
select is(public.approve_completions(array[]::uuid[]), 0, 'tom liste godkjenner ingenting');
select tests.logout();

select set_config('role', 'anon', true);
select throws_ok($$select public.approve_completions(array[]::uuid[])$$, '42501', null,
  'anon kan ikke kalle approve_completions');
select tests.logout();

select is(tests.status_of('t1'), 'pending'::public.completion_status, 't1 venter fortsatt');

-- Ingen kan endre status direkte i tabellen.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok(format($$update public.task_completions set status = 'approved' where id = %L$$, tests.cid('t1')),
  '42501', null, 'status kan ikke endres direkte, bare via RPC');
select tests.logout();

-- ===========================================================================
-- 4. Godkjenning
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is(public.approve_completions(array[tests.cid('t4a'), tests.cid('t5')]), 1,
  'godkjenner bare ventende rader (t5 var allerede godkjent)');
select is(public.approve_completions(array[tests.cid('t4a')]), 0, 'trygt å godkjenne to ganger');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '15/50/10/5',
  'godkjent beløp flyttes fra venter til saldo');
select tests.logout();

-- ===========================================================================
-- 5. Avvisning: beløpet trekkes, og oppgaven er ikke gjort
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- Gjentakende oppgave, siste avkrysning: fristen settes tilbake til i dag.
select is((select next_due_on from public.tasks where id = 'aaaaaaaa-1111-0000-0000-000000000001'),
  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 1, 't1 har fått neste frist i morgen');
select lives_ok(format('select public.reject_completion(%L)', tests.cid('t1')),
  'en voksen kan avvise');
select is((select next_due_on from public.tasks where id = 'aaaaaaaa-1111-0000-0000-000000000001'),
  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'avvist siste avkrysning: fristen er satt tilbake');
select ok(exists (select 1 from public.today_tasks where id = 'aaaaaaaa-1111-0000-0000-000000000001'),
  'den avviste oppgaven er tilbake i «I dag»');

-- Engangsjobb: blir ledig igjen.
select is((select archived_at is not null from public.tasks where id = 'aaaaaaaa-1111-0000-0000-000000000002'),
  true, 'engangsjobben er borte fra tavla etter avkrysning');
select lives_ok(format('select public.reject_completion(%L)', tests.cid('t2')),
  'en voksen kan avvise en engangsjobb');
select is((select archived_at from public.tasks where id = 'aaaaaaaa-1111-0000-0000-000000000002'),
  null, 'avvist engangsjobb er ledig igjen');
select ok(exists (select 1 from public.today_tasks where id = 'aaaaaaaa-1111-0000-0000-000000000002'),
  'engangsjobben vises under «Ledige jobber» igjen');

-- Ikke siste avkrysning: bare statusen endres, fristen står.
select lives_ok(format('select public.reject_completion(%L)', tests.cid('t6a')),
  'en voksen kan avvise en eldre avkrysning');
select is((select next_due_on from public.tasks where id = 'aaaaaaaa-1111-0000-0000-000000000006'),
  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 1,
  'fristen settes ikke tilbake til i dag når en nyere avkrysning finnes (intervall: i morgen)');

select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '15/15/10/5',
  'avviste beløp er trukket (venter: t4b 5 + t6b 10)');

select throws_ok(format('select public.reject_completion(%L)', tests.cid('t1')),
  'P0001', 'not_pending', 'en avvist avkrysning kan ikke avvises igjen');
select throws_ok(format('select public.reject_completion(%L)', tests.cid('t4a')),
  'P0001', 'not_pending', 'en godkjent avkrysning kan ikke avvises');
select is(public.approve_completions(array[tests.cid('t1')]), 0,
  'en avvist avkrysning kan ikke godkjennes etterpå');
select tests.logout();

select is(tests.status_of('t1'), 'rejected'::public.completion_status, 't1 er fortsatt avvist');

-- Barnet ser at avkrysningen ikke ble godkjent.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select is((select status from public.task_completions where id = tests.cid('t1')),
  'rejected'::public.completion_status, 'barnet ser at avkrysningen ikke ble godkjent');

-- ===========================================================================
-- 6. Angring
-- ===========================================================================
select throws_ok(format('select public.undo_completion(%L)', tests.cid('t1')),
  'P0001', 'undo_not_allowed', 'en avvist avkrysning kan ikke angres');

-- Barnet kan fortsatt angre sin egen ventende avkrysning innen 10 minutter.
-- t4b er siste avkrysning på oppvasken.
select lives_ok(format('select public.undo_completion(%L)', tests.cid('t4b')),
  'barnet kan angre sin egen ventende avkrysning');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '15/10/10/5',
  'angret beløp er borte fra det som venter');

-- Barnet krysser av den avviste oppgaven på nytt: ny avkrysning som venter.
select tests.complete('t1-igjen', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
select is((select status from tests.res where name = 't1-igjen'), 'pending'::public.completion_status,
  'den avviste oppgaven kan gjøres på nytt, og venter igjen');
select tests.logout();

-- «Godkjenn alle»: flere på én gang.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is(public.approve_completions(array[tests.cid('t1-igjen'), tests.cid('t6b')]), 2,
  '«Godkjenn alle» godkjenner flere på én gang');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '35/0/10/25',
  'sluttsaldo: 35 godkjent − 10 utbetalt = 25, ingenting venter');
select tests.logout();

select * from finish();
rollback;
