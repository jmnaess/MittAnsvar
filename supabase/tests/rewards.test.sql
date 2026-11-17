-- Tester for steg 9: lønn per oppgave, utbetalinger, saldo og ledige jobber.
-- Se docs/DATABASE.md §1–3 og §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

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

create table tests.res (name text, completion_id uuid, reward_nok integer);
grant all on tests.res to authenticated;

-- Kaller complete_task og lagrer resultatet under et navn.
create function tests.complete(p_name text, p_task uuid, p_member uuid)
returns void language plpgsql as $$
begin
  insert into tests.res
  select p_name, r.completion_id, r.reward_nok
  from public.complete_task(p_task, p_member) r;
end;
$$;
grant execute on function tests.complete(text, uuid, uuid) to authenticated;

create function tests.cid(p_name text)
returns uuid language sql as $$ select completion_id from tests.res where name = p_name $$;
grant execute on function tests.cid(text) to authenticated;

create function tests.balance(p_member uuid)
returns integer language sql as $$
  select balance_nok from public.member_balances where member_id = p_member
$$;
grant execute on function tests.balance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A (med enhet).
--   B: voksen B, barn B.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000a002', null),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com');

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A',   'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'frog', 2015, null);

-- ===========================================================================
-- 1. Voksen A lager oppgaver med lønn (bare voksne kan sette beløp)
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select lives_ok($$
  insert into public.tasks (household_id, title, assigned_member_id, recurrence_type,
                            recurrence_unit, recurrence_every, reward_nok)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rydde rommet',
          'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10)
$$, 'en voksen kan lage en oppgave med lønn');

select lives_ok($$
  insert into public.tasks (household_id, title, recurrence_type, reward_nok)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Henge opp vask', 'job', 15)
$$, 'en voksen kan lage en engangsjobb');

select lives_ok($$
  insert into public.tasks (household_id, title, recurrence_type, job_repeats, reward_nok)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tømme oppvaskmaskinen', 'job', true, 5)
$$, 'en voksen kan lage en gjentakende jobb');

-- Klienten kan ikke sende id. Faste id-er gjør resten av testene lettere å lese.
select tests.logout();
update public.tasks set id = '11111111-0000-0000-0000-000000000001' where title = 'Rydde rommet';
update public.tasks set id = '11111111-0000-0000-0000-000000000002' where title = 'Henge opp vask';
update public.tasks set id = '11111111-0000-0000-0000-000000000003' where title = 'Tømme oppvaskmaskinen';
select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- ===========================================================================
-- 2. Beløpet lagres ved avkrysning, og endret pris endrer ikke tidligere beløp
-- ===========================================================================
select tests.complete('t1-barn', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
select is((select reward_nok from public.task_completions where id = tests.cid('t1-barn')), 10,
  'beløpet lagres på avkrysningen når et barn gjør oppgaven');
select is((select reward_nok from tests.res where name = 't1-barn'), 10,
  'complete_task returnerer beløpet');

update public.tasks set reward_nok = 20 where id = '11111111-0000-0000-0000-000000000001';
select is((select reward_nok from public.task_completions where id = tests.cid('t1-barn')), 10,
  'endret pris endrer ikke beløpet på en tidligere avkrysning');

-- ===========================================================================
-- 3. Voksne får ikke lønn
-- ===========================================================================
select tests.complete('t1-voksen', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
select is((select reward_nok from public.task_completions where id = tests.cid('t1-voksen')), null,
  'en voksen som gjør oppgaven, får ikke lønn');
select is((select reward_nok from tests.res where name = 't1-voksen'), null,
  'complete_task returnerer null som beløp for en voksen');

-- ===========================================================================
-- 4. Angring fjerner beløpet
-- ===========================================================================
select tests.complete('t1-barn-2', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
select is((select reward_nok from public.task_completions where id = tests.cid('t1-barn-2')), 20,
  'ny avkrysning får den nye prisen');
select is(tests.balance('aaaaaaaa-0000-0000-0000-000000000002'), 30, 'saldoen er 10 + 20 før angring');
select lives_ok($$select public.undo_completion(tests.cid('t1-barn-2'))$$, 'avkrysningen kan angres');
select is((select count(*)::int from public.task_completions where id = tests.cid('t1-barn-2')), 0,
  'angring sletter avkrysningen med beløpet');
select is(tests.balance('aaaaaaaa-0000-0000-0000-000000000002'), 10, 'saldoen går ned etter angring');

-- ===========================================================================
-- 5. Jobber har ingen frist, er aldri forfalt og er ikke med i forekomstene
-- ===========================================================================
select is((select count(*)::int from public.tasks
           where recurrence_type = 'job' and next_due_on is not null), 0,
  'jobber har aldri frist');
select is((select is_overdue from public.today_tasks where id = '11111111-0000-0000-0000-000000000002'), false,
  'en engangsjobb står i today_tasks og er ikke forfalt');
select is((select is_overdue from public.today_tasks where id = '11111111-0000-0000-0000-000000000003'), false,
  'en gjentakende jobb står i today_tasks og er ikke forfalt');
select is((select count(*)::int
           from public.get_upcoming_occurrences('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
                  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 366)
           where task_id in ('11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003')), 0,
  'jobber er ikke med i forekomstene for påminnelser');
select ok((select count(*) from public.get_upcoming_occurrences('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
             private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 7)) > 0,
  'vanlige oppgaver er fortsatt med i forekomstene');

-- ===========================================================================
-- 6. Engangsjobb arkiveres etter utføring, og angring henter den tilbake
-- ===========================================================================
select tests.complete('j1', '11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002');
select is((select reward_nok from public.task_completions where id = tests.cid('j1')), 15,
  'engangsjobben gir lønn');
select isnt((select archived_at from public.tasks where id = '11111111-0000-0000-0000-000000000002'), null,
  'engangsjobben arkiveres etter utføring');
select is((select count(*)::int from public.today_tasks where id = '11111111-0000-0000-0000-000000000002'), 0,
  'engangsjobben forsvinner fra today_tasks');
select throws_ok(
  $$select public.complete_task('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'P0001', 'task_not_found', 'en utført engangsjobb kan ikke gjøres igjen');

select lives_ok($$select public.undo_completion(tests.cid('j1'))$$, 'engangsjobben kan angres');
select is((select archived_at from public.tasks where id = '11111111-0000-0000-0000-000000000002'), null,
  'angring legger engangsjobben tilbake på tavla');
select tests.complete('j1-igjen', '11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002');

-- ===========================================================================
-- 7. Gjentakende jobb kan gjøres flere ganger
-- ===========================================================================
select tests.complete('j2-1', '11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('j2-2', '11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002');
select is((select count(*)::int from public.task_completions where task_id = '11111111-0000-0000-0000-000000000003'), 2,
  'den gjentakende jobben er gjort to ganger');
select is((select archived_at from public.tasks where id = '11111111-0000-0000-0000-000000000003'), null,
  'den gjentakende jobben blir stående');
select is((select count(*)::int from public.today_tasks where id = '11111111-0000-0000-0000-000000000003'), 1,
  'den gjentakende jobben står fortsatt i today_tasks');

-- ===========================================================================
-- 8. Saldo og utbetalinger
--    Tjent: 10 (rydde) + 15 (vask) + 5 + 5 (oppvask) = 35.
-- ===========================================================================
select is((select earned_nok from public.member_balances where member_id = 'aaaaaaaa-0000-0000-0000-000000000002'), 35,
  'opptjent er summen av beløpene på avkrysningene');
select throws_ok(
  $$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 36)$$,
  'P0001', 'amount_exceeds_balance', 'utbetaling over saldoen avvises');
select throws_ok(
  $$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 0)$$,
  'P0001', 'amount_exceeds_balance', 'utbetaling på 0 kr avvises');
select throws_ok(
  $$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000001', 5)$$,
  'P0001', 'invalid_member', 'utbetaling til en voksen avvises');
select lives_ok(
  $$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 25)$$,
  'en voksen kan registrere utbetaling');
select is((select recorded_by_member_id from public.payouts), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'utbetalingen husker hvilken voksen som registrerte den');
select is(tests.balance('aaaaaaaa-0000-0000-0000-000000000002'), 10, 'saldo = tjent − utbetalt');
select lives_ok(
  $$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 10)$$,
  'hele resten av saldoen kan betales ut');
select is(tests.balance('aaaaaaaa-0000-0000-0000-000000000002'), 0, 'saldoen er 0 etter full utbetaling');
select tests.logout();

-- ===========================================================================
-- 9. Barn kan ikke sette beløp eller registrere utbetaling
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a002');

update public.tasks set reward_nok = 1000 where id = '11111111-0000-0000-0000-000000000001';
select is((select reward_nok from public.tasks where id = '11111111-0000-0000-0000-000000000001'), 20,
  'et barn kan ikke endre beløpet');
select throws_ok($$
  insert into public.tasks (household_id, title, recurrence_type, reward_nok)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Barnets jobb', 'job', 100)
$$, '42501', null, 'et barn kan ikke lage en oppgave med lønn');
select throws_ok(
  $$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 1)$$,
  'P0001', 'not_adult', 'et barn kan ikke registrere utbetaling');
select throws_ok(
  $$insert into public.payouts (household_id, member_id, amount_nok)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-000000000002', 1)$$,
  '42501', null, 'ingen kan skrive direkte i payouts');
select tests.logout();

-- ===========================================================================
-- 10. Ingen ser saldo, utbetalinger eller jobber i en annen husstand
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000b001');

select is((select count(*)::int from public.payouts), 0, 'B ser ingen utbetalinger i A');
select is((select array_agg(member_id) from public.member_balances),
  array['bbbbbbbb-0000-0000-0000-000000000002'::uuid], 'B ser bare saldoen til sitt eget barn');
select is((select count(*)::int from public.tasks where recurrence_type = 'job'), 0, 'B ser ingen jobber i A');
select is((select count(*)::int from public.today_tasks where recurrence_type = 'job'), 0,
  'B ser ingen jobber i A i today_tasks');
select throws_ok(
  $$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 1)$$,
  'P0001', 'not_adult', 'B kan ikke registrere utbetaling til barnet i A');
select tests.logout();

-- ===========================================================================
-- 11. Check-constraints
-- ===========================================================================
select throws_ok($$
  insert into public.tasks (household_id, title, recurrence_type, job_repeats)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feil', 'once', true)
$$, '23514', null, 'job_repeats er bare lov for jobber');
select throws_ok($$
  insert into public.tasks (household_id, title, recurrence_type, recurrence_unit, recurrence_every)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feil', 'job', 'day', 1)
$$, '23514', null, 'en jobb kan ikke ha gjentakelseskolonner');

select * from finish();
rollback;
