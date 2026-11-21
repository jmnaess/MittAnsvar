-- Tester for lønn i ettertid, ekstra lønn og forskudd (*_extra_rewards_and_advances.sql).
-- Se docs/DATABASE.md §1 (extra_rewards, member_balances), §3 og §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(84);

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

create table tests.res (name text, completion_id uuid);
grant all on tests.res to authenticated;

create table tests.extra (name text, id uuid);
grant all on tests.extra to authenticated;

-- Kaller complete_task og lagrer avkrysningens id under et navn.
create function tests.complete(p_name text, p_task uuid, p_member uuid)
returns void language plpgsql as $$
begin
  insert into tests.res
  select p_name, r.completion_id from public.complete_task(p_task, p_member) r;
end;
$$;

create function tests.cid(p_name text)
returns uuid language sql as $$ select completion_id from tests.res where name = p_name $$;

-- Kaller add_extra_reward og lagrer id-en under et navn.
create function tests.add_extra(p_name text, p_member uuid, p_amount integer, p_reason text default null)
returns void language plpgsql as $$
begin
  insert into tests.extra values (p_name, public.add_extra_reward(p_member, p_amount, p_reason));
end;
$$;

create function tests.xid(p_name text)
returns uuid language sql as $$ select id from tests.extra where name = p_name $$;

-- «godkjent/venter/utbetalt/ekstra/saldo»
create function tests.bal(p_member uuid)
returns text language sql as $$
  select earned_nok || '/' || pending_nok || '/' || paid_nok || '/' || extra_nok || '/' || balance_nok
  from public.member_balances where member_id = p_member
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A1 og A2 (begge med enhet), familieskjerm.
--   B: voksen B, barn B (med enhet).
--   C: voksen C, barn C (til sletting av husstanden).
--   T1 Rydde rommet  daglig, til A1, 20 kr
--   T2 Søppel        daglig, til A1, 10 kr (barnet krysser av: venter)
--   T3 Handle        felles, 10 kr (den voksne gjør den: ingen lønn)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000a004', null, true),
  ('00000000-0000-0000-0000-00000000d001', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false),
  ('00000000-0000-0000-0000-00000000b002', null, true),
  ('00000000-0000-0000-0000-00000000c001', 'voksen-c@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'C', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A1',  'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A2',  'frog', 2018, '00000000-0000-0000-0000-00000000a004'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'bear', 2015, '00000000-0000-0000-0000-00000000b002'),
  ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C', 'seal', null, '00000000-0000-0000-0000-00000000c001'),
  ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'child', 'Barn C',   'dog',  2014, null);

insert into public.household_displays (household_id, auth_user_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-00000000d001');

insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type,
                          recurrence_unit, recurrence_every, reward_nok) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rydde rommet',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 20),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Søppel',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Handle',
   null, 'interval', 'day', 1, 10);

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select tests.complete('c1', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.complete('adult', 'aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select tests.complete('c2', 'aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002');
select tests.logout();

-- ===========================================================================
-- 1. En voksen endrer lønnen på en godkjent avkrysning
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '20/10/0/0/20', 'startsaldo: 20 godkjent, 10 venter');

select lives_ok($$select public.set_completion_reward(tests.cid('c1'), 35)$$, 'beløpet kan settes opp');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '35/10/0/0/35', 'saldoen øker');
select lives_ok($$select public.set_completion_reward(tests.cid('c1'), 15)$$, 'beløpet kan settes ned');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '15/10/0/0/15', 'saldoen går ned');
select is((select reward_nok from public.tasks where id = 'aaaaaaaa-1111-0000-0000-000000000001'), 20,
  'oppgavens pris er uendret');
select is((select status from public.task_completions where id = tests.cid('c1')),
  'approved'::public.completion_status, 'statusen er uendret');

select throws_ok($$select public.set_completion_reward(tests.cid('c1'), -1)$$,
  'P0001', 'invalid_amount', 'negativt beløp avvises');
select throws_ok($$select public.set_completion_reward(tests.cid('c1'), 10001)$$,
  'P0001', 'invalid_amount', 'over 10 000 kr avvises');
select throws_ok($$select public.set_completion_reward(tests.cid('c1'), null)$$,
  'P0001', 'invalid_amount', 'tomt beløp avvises');
select throws_ok($$select public.set_completion_reward(tests.cid('c2'), 5)$$,
  'P0001', 'reward_not_changeable', 'en ventende avkrysning kan ikke endres her');
select throws_ok($$select public.set_completion_reward(tests.cid('adult'), 5)$$,
  'P0001', 'reward_not_changeable', 'en voksen kan ikke få lønn');
select lives_ok($$select public.reject_completion(tests.cid('c2'))$$, 'avviser c2');
select throws_ok($$select public.set_completion_reward(tests.cid('c2'), 5)$$,
  'P0001', 'reward_not_changeable', 'en avvist avkrysning kan ikke endres');

select lives_ok($$select public.set_completion_reward(tests.cid('c1'), 0)$$, '0 kr = ingen lønn');
select is((select reward_nok from public.task_completions where id = tests.cid('c1')), null,
  'beløpet blir null, så raden er borte fra lønnshistorikken');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '0/0/0/0/0', 'saldoen er 0');
select lives_ok($$select public.set_completion_reward(tests.cid('c1'), 20)$$,
  'en godkjent avkrysning uten lønn kan få lønn igjen');
select tests.logout();

select is((select next_due_on from public.tasks where id = 'aaaaaaaa-1111-0000-0000-000000000001'),
  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') + 1, 'fristen er uendret');

-- ===========================================================================
-- 2. Utbetaling over saldoen gir forskudd
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 50)$$,
  'utbetaling over saldoen går');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '20/0/50/0/-30', 'forskudd på 30 kr');
select throws_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 0)$$,
  'P0001', 'invalid_amount', 'utbetaling på 0 kr avvises');
select throws_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 10001)$$,
  'P0001', 'invalid_amount', 'utbetaling over 10 000 kr avvises');

select tests.complete('c3', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '40/0/50/0/-10',
  'ny lønn betaler ned forskuddet');
select lives_ok($$select public.set_completion_reward(tests.cid('c3'), 5)$$,
  'beløpet kan settes ned etter utbetaling');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '25/0/50/0/-25', 'forskuddet øker');

-- ===========================================================================
-- 3. Ekstra lønn
-- ===========================================================================
select lives_ok($$select tests.add_extra('hjalp', 'aaaaaaaa-0000-0000-0000-000000000002', 50, '  Ekstra for at du hjalp Thelma  ')$$,
  'ekstra lønn med tekst');
select lives_ok($$select tests.add_extra('blank', 'aaaaaaaa-0000-0000-0000-000000000002', 10, '   ')$$,
  'ekstra lønn med bare mellomrom');
select lives_ok($$select tests.add_extra('uten', 'aaaaaaaa-0000-0000-0000-000000000002', 5)$$,
  'ekstra lønn uten tekst');
select tests.logout();

select is((select reason from public.extra_rewards where id = tests.xid('hjalp')),
  'Ekstra for at du hjalp Thelma', 'teksten trimmes');
select is((select reason from public.extra_rewards where id = tests.xid('blank')), null,
  'bare mellomrom gir ingen tekst');
select is((select reason from public.extra_rewards where id = tests.xid('uten')), null,
  'uten tekst gir ingen tekst');
select is((select given_on from public.extra_rewards where id = tests.xid('hjalp')),
  private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'given_on er husstandens dato i dag');
select is((select created_by_member_id from public.extra_rewards where id = tests.xid('hjalp')),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'husker hvilken voksen som ga det');

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '25/0/50/65/40',
  'ekstra lønn går rett inn i saldoen');

select throws_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000002', 0)$$,
  'P0001', 'invalid_amount', '0 kr avvises');
select throws_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000002', 10001)$$,
  'P0001', 'invalid_amount', 'over 10 000 kr avvises');
select throws_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000002', null)$$,
  'P0001', 'invalid_amount', 'tomt beløp avvises');
select throws_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000002', 10, repeat('a', 81))$$,
  'P0001', 'invalid_reason', 'tekst over 80 tegn avvises');
select lives_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000004', 7, repeat('a', 80))$$,
  'tekst på 80 tegn går (til A2)');
select throws_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000001', 10)$$,
  'P0001', 'invalid_member', 'en voksen kan ikke få ekstra lønn');
select throws_ok($$select public.add_extra_reward('bbbbbbbb-0000-0000-0000-000000000002', 10)$$,
  'P0001', 'not_adult', 'kan ikke gi til et barn i en annen husstand');
select throws_ok($$select public.add_extra_reward(gen_random_uuid(), 10)$$,
  'P0001', 'not_adult', 'ukjent id gir samme feil');

-- Angre et tillegg
select lives_ok($$select public.delete_extra_reward(tests.xid('hjalp'))$$, 'en voksen kan slette et tillegg');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '25/0/50/15/-10',
  'saldoen går ned, og det kan gi forskudd');
select throws_ok($$select public.delete_extra_reward(tests.xid('hjalp'))$$,
  'P0001', 'not_adult', 'et slettet tillegg kan ikke slettes igjen');

-- ===========================================================================
-- 4. Det som var sperret, gir nå forskudd
-- ===========================================================================
select lives_ok($$select public.set_completion_status(tests.cid('c3'), 'rejected')$$,
  '«Ikke godkjent» på utbetalt lønn går');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '20/0/50/15/-15', 'forskuddet øker');
select lives_ok($$select public.remove_completion(tests.cid('c1'))$$,
  '«Ikke gjort» på utbetalt lønn går');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '0/0/50/15/-35', 'forskuddet øker igjen');
select tests.complete('c4', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
select lives_ok($$select public.reassign_completion(tests.cid('c4'), 'aaaaaaaa-0000-0000-0000-000000000004')$$,
  '«Endre hvem» på lønn til et barn med forskudd går');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '0/0/50/15/-35', 'A1 har fortsatt 35 kr i forskudd');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000004'), '20/0/0/7/27', 'A2 fikk lønnen');
select tests.logout();

-- ===========================================================================
-- 5. Barnet: kan ikke skrive, ser bare egne
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select throws_ok($$select public.set_completion_reward(tests.cid('c4'), 50)$$,
  'P0001', 'not_adult', 'barnet kan ikke endre beløp');
select throws_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000002', 50)$$,
  'P0001', 'not_adult', 'barnet kan ikke gi seg selv ekstra lønn');
select throws_ok($$select public.delete_extra_reward(tests.xid('uten'))$$,
  'P0001', 'not_adult', 'barnet kan ikke slette et tillegg');
select throws_ok($$
  insert into public.extra_rewards (household_id, member_id, amount_nok, given_on)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-000000000002', 50, current_date)
$$, '42501', null, 'barnet kan ikke sette inn direkte');
select throws_ok($$update public.extra_rewards set amount_nok = 500$$, '42501', null,
  'barnet kan ikke endre direkte');
select throws_ok($$delete from public.extra_rewards$$, '42501', null, 'barnet kan ikke slette direkte');
select throws_ok($$update public.task_completions set reward_nok = 500$$, '42501', null,
  'barnet kan ikke endre beløpet på en avkrysning direkte');
select is((select count(*)::int from public.extra_rewards), 2, 'barnet ser sine egne to tillegg');
select is((select count(*)::int from public.extra_rewards where member_id = 'aaaaaaaa-0000-0000-0000-000000000004'), 0,
  'barnet ser ikke søskens tillegg');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '0/0/50/15/-35', 'barnet ser egen saldo med forskudd');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select is((select count(*)::int from public.extra_rewards), 1, 'søsken ser bare sitt eget tillegg');
select tests.logout();

-- ===========================================================================
-- 6. Familieskjerm, annen husstand og anon
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select is((select count(*)::int from public.extra_rewards), 0, 'familieskjermen ser ingen tillegg');
select is((select count(*)::int from public.member_balances), 0, 'familieskjermen ser ingen saldo');
select throws_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000002', 10)$$,
  'P0001', 'not_adult', 'familieskjermen kan ikke gi ekstra lønn');
select throws_ok($$select public.delete_extra_reward(tests.xid('uten'))$$,
  'P0001', 'not_adult', 'familieskjermen kan ikke slette et tillegg');
select throws_ok($$select public.set_completion_reward(tests.cid('c4'), 50)$$,
  'P0001', 'not_adult', 'familieskjermen kan ikke endre beløp');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*)::int from public.extra_rewards), 0, 'en annen husstand ser ingen tillegg');
select throws_ok($$select public.delete_extra_reward(tests.xid('uten'))$$,
  'P0001', 'not_adult', 'en annen husstand kan ikke slette');
select throws_ok($$select public.set_completion_reward(tests.cid('c4'), 50)$$,
  'P0001', 'not_adult', 'en annen husstand kan ikke endre beløp');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000b002');
select is((select count(*)::int from public.extra_rewards), 0, 'et barn i en annen husstand ser ingen tillegg');
select tests.logout();

select set_config('role', 'anon', true);
select throws_ok($$select count(*) from public.extra_rewards$$, '42501', null, 'anon kan ikke lese tillegg');
select throws_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000002', 10)$$,
  '42501', null, 'anon kan ikke kalle add_extra_reward');
select tests.logout();

-- ===========================================================================
-- 7. Utløpt prøvetid stopper skriving
-- ===========================================================================
update public.households set trial_ends_at = now() - interval '1 day'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.add_extra_reward('aaaaaaaa-0000-0000-0000-000000000002', 10)$$,
  'P0001', 'subscription_required', 'utløpt: kan ikke gi ekstra lønn');
select throws_ok($$select public.delete_extra_reward(tests.xid('uten'))$$,
  'P0001', 'subscription_required', 'utløpt: kan ikke slette et tillegg');
select throws_ok($$select public.set_completion_reward(tests.cid('c4'), 50)$$,
  'P0001', 'subscription_required', 'utløpt: kan ikke endre beløp');
select throws_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 10)$$,
  'P0001', 'subscription_required', 'utløpt: kan ikke registrere utbetaling');
select is((select count(*)::int from public.extra_rewards), 3, 'utløpt: kan fortsatt lese');
select tests.logout();

update public.households set trial_ends_at = now() + interval '14 days'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- ===========================================================================
-- 8. Sletting
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
delete from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000004';
select tests.logout();
select is((select count(*)::int from public.extra_rewards where member_id = 'aaaaaaaa-0000-0000-0000-000000000004'), 0,
  'tilleggene slettes med barnet');
select is((select count(*)::int from public.extra_rewards where member_id = 'aaaaaaaa-0000-0000-0000-000000000002'), 2,
  'søskens tillegg blir stående');

select tests.login_as('00000000-0000-0000-0000-00000000c001');
select lives_ok($$select public.add_extra_reward('cccccccc-0000-0000-0000-000000000002', 25, 'Takk')$$,
  'voksen C gir ekstra lønn');
select public.delete_my_account_data();
select tests.logout();
select is((select count(*)::int from public.extra_rewards where household_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 0,
  'siste voksne sletter seg: tilleggene slettes med husstanden');

select * from finish();
rollback;
