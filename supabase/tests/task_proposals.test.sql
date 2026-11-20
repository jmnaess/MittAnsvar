-- Tester for forslag fra barn (task_proposals, submit_task_proposal, list_my_task_proposals,
-- decide_task_proposal, delete_old_task_proposals). Se docs/DATABASE.md. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(88);

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

-- Forslag og oppgaver lagres under et navn.
create table tests.ids (name text primary key, id uuid);
grant all on tests.ids to authenticated;

create function tests.submit(p_name text, p_title text, p_done boolean, p_wants boolean,
                             p_nok integer default null)
returns void language plpgsql as $$
begin
  insert into tests.ids values (p_name, public.submit_task_proposal(p_title, p_done, p_wants, p_nok));
end;
$$;

create function tests.id(p_name text)
returns uuid language sql as $$ select id from tests.ids where name = p_name $$;

-- Avgjør og lagrer oppgaven som ble laget under «<navn>-task».
create function tests.decide(p_name text, p_approve boolean, p_amount integer default null)
returns void language plpgsql as $$
begin
  insert into tests.ids
  values (p_name || '-task', public.decide_task_proposal(tests.id(p_name), p_approve, p_amount));
end;
$$;

-- Lest som postgres (uten RLS).
create function tests.proposal(p_name text)
returns public.task_proposals language sql security definer as $$
  select * from public.task_proposals where id = tests.id(p_name)
$$;

create function tests.task(p_name text)
returns public.tasks language sql security definer as $$
  select * from public.tasks where id = tests.id(p_name || '-task')
$$;

create function tests.completion(p_name text)
returns public.task_completions language sql security definer as $$
  select * from public.task_completions where task_id = tests.id(p_name || '-task')
$$;

create function tests.bal(p_member uuid)
returns text language sql as $$
  select earned_nok || '/' || pending_nok || '/' || paid_nok || '/' || balance_nok
  from public.member_balances where member_id = p_member
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A (a001), voksen A2 (a003), barn A1 med enhet (a002), barn A2 med enhet (a004),
--      familieskjerm (d001).
--   B: voksen B (b001), barn B med enhet (b002).
--   C: voksen C (c001, eneste voksne), barn C med enhet (c002).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000a003', 'voksen-a2@example.com', false),
  ('00000000-0000-0000-0000-00000000a004', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false),
  ('00000000-0000-0000-0000-00000000b002', null, true),
  ('00000000-0000-0000-0000-00000000c001', 'voksen-c@example.com', false),
  ('00000000-0000-0000-0000-00000000c002', null, true),
  ('00000000-0000-0000-0000-00000000d001', null, true);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'C', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A',  'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A1',   'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A2', 'elk',  null, '00000000-0000-0000-0000-00000000a003'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A2',   'frog', 2018, '00000000-0000-0000-0000-00000000a004'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B',  'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',    'bear', 2015, '00000000-0000-0000-0000-00000000b002'),
  ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C',  'seal', null, '00000000-0000-0000-0000-00000000c001'),
  ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'child', 'Barn C',    'dog',  2014, '00000000-0000-0000-0000-00000000c002');

insert into public.household_displays (household_id, auth_user_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-00000000d001');

-- ===========================================================================
-- 1. Barnet sender og leser egne forslag
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select lives_ok($$select tests.submit('boden', '  Ryddet boden  ', true, false)$$,
  'barnet sender et forslag (gjort, uten lønn)');
select lives_ok($$select tests.submit('bilen', 'Vaske bilen', false, true, 50)$$,
  'barnet sender et forslag (ikke gjort, ønsker 50 kr)');
select lives_ok($$select tests.submit('hagen', 'Raket løv', true, true, 50)$$,
  'barnet sender et forslag (gjort, ønsker 50 kr)');
select lives_ok($$select tests.submit('nei', 'Spille hele dagen', false, true)$$,
  'barnet kan ønske lønn uten å foreslå beløp');
select is((select count(*)::int from public.list_my_task_proposals()), 4, 'barnet ser sine fire forslag');
select is((select title from public.list_my_task_proposals() where id = tests.id('boden')), 'Ryddet boden',
  'tittelen er trimmet');
select is((select status from public.list_my_task_proposals() where id = tests.id('boden')),
  'pending'::public.proposal_status, 'forslaget venter');
select is((select count(*)::int from public.task_proposals), 0, 'barnet kan ikke lese tabellen direkte');
select tests.logout();

select is((tests.proposal('boden')).member_id, 'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
  'member_id er kalleren');
select is((tests.proposal('boden')).household_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'household_id er kallerens husstand');

-- Søsken ser ikke forslagene.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select is((select count(*)::int from public.list_my_task_proposals()), 0, 'søsken ser ikke forslagene');
select tests.logout();

-- ===========================================================================
-- 2. Ugyldige forslag
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select throws_ok($$select public.submit_task_proposal('   ', true, false)$$,
  'P0001', 'invalid_title', 'tom tittel avvises');
select throws_ok(format('select public.submit_task_proposal(%L, true, false)', repeat('x', 61)),
  'P0001', 'invalid_title', 'tittel på 61 tegn avvises');
select lives_ok(format('select tests.submit(%L, %L, true, false)', 'lang', repeat('x', 60)),
  'tittel på 60 tegn går');
select throws_ok($$select public.submit_task_proposal('Mye', true, true, 201)$$,
  'P0001', 'invalid_amount', 'beløp over 200 avvises');
select throws_ok($$select public.submit_task_proposal('Null', true, true, 0)$$,
  'P0001', 'invalid_amount', 'beløp 0 avvises');
select throws_ok($$select public.submit_task_proposal('Uten', true, false, 20)$$,
  'P0001', 'invalid_amount', 'beløp uten ønske om lønn avvises');
select tests.logout();

-- ===========================================================================
-- 3. Grensen på 5 som venter (A1 har 5 nå)
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select throws_ok($$select public.submit_task_proposal('Nummer seks', true, false)$$,
  'P0001', 'too_many_pending', 'nr. 6 som venter avvises');
select tests.logout();

-- ===========================================================================
-- 4. Hvem kan sende og lese
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.submit_task_proposal('Voksen', true, false)$$,
  'P0001', 'not_child', 'en voksen kan ikke sende forslag');
select is((select count(*)::int from public.task_proposals), 5, 'voksen A ser alle forslagene i husstanden');
select is((select count(*)::int from public.list_my_task_proposals()), 0, 'list_my_task_proposals er tom for voksne');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select throws_ok($$select public.submit_task_proposal('Skjerm', true, false)$$,
  'P0001', 'not_child', 'familieskjermen kan ikke sende forslag');
select is((select count(*)::int from public.task_proposals), 0, 'familieskjermen ser ingen forslag');
select is((select count(*)::int from public.list_my_task_proposals()), 0, 'familieskjermen får tom liste');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*)::int from public.task_proposals), 0, 'en annen husstand ser ingen forslag');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000b002');
select is((select count(*)::int from public.list_my_task_proposals()), 0, 'barn i en annen husstand ser ingenting');
select tests.logout();

select set_config('role', 'anon', true);
select throws_ok($$select public.submit_task_proposal('Anon', true, false)$$, '42501', null,
  'anon kan ikke sende forslag');
select throws_ok($$select * from public.list_my_task_proposals()$$, '42501', null,
  'anon kan ikke lese forslag');
select throws_ok($$select count(*) from public.task_proposals$$, '42501', null,
  'anon kan ikke lese tabellen');
select tests.logout();

-- ===========================================================================
-- 5. Godkjent: gjort, uten lønn
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select tests.decide('boden', true)$$, 'voksen godkjenner «Ryddet boden»');
select tests.logout();

select is((tests.proposal('boden')).status, 'approved'::public.proposal_status, 'forslaget er godkjent');
select ok((tests.proposal('boden')).decided_at is not null
          and (tests.proposal('boden')).decided_by_member_id = 'aaaaaaaa-0000-0000-0000-000000000001',
  'hvem og når er lagret');
select is((tests.proposal('boden')).task_id, tests.id('boden-task'), 'oppgaven er lagret på forslaget');
select ok((tests.task('boden')).recurrence_type = 'job' and not (tests.task('boden')).job_repeats
          and (tests.task('boden')).archived_at is not null
          and (tests.task('boden')).job_member_ids = array['aaaaaaaa-0000-0000-0000-000000000002'::uuid],
  'gjort: en arkivert engangsjobb for barnet');
select is((tests.completion('boden')).completed_by_member_id, 'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
  'avkrysningen er registrert på barnet');
select ok((tests.completion('boden')).status = 'approved' and (tests.completion('boden')).reward_nok is null,
  'uten lønn: godkjent, ingen beløp');

-- ===========================================================================
-- 6. Godkjent: gjort, med lønn (barnet ba om 50, voksen gir 30)
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select tests.decide('hagen', true, 30)$$, 'voksen godkjenner «Raket løv» med 30 kr');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '30/0/0/30', 'saldo: 30 kr godkjent med én gang');
select ok((tests.completion('hagen')).status = 'approved' and (tests.completion('hagen')).reward_nok = 30,
  'avkrysningen er godkjent med 30 kr');
select is((tests.proposal('hagen')).approved_nok, 30, 'godkjent beløp er lagret på forslaget');
select lives_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000002', 30)$$,
  'de 30 kronene kan betales ut');
select tests.logout();

-- ===========================================================================
-- 7. Godkjent: ikke gjort, med lønn
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select tests.decide('bilen', true, 20)$$, 'voksen godkjenner «Vaske bilen» med 20 kr');
select tests.logout();

select ok((tests.task('bilen')).recurrence_type = 'once'
          and (tests.task('bilen')).assigned_member_id = 'aaaaaaaa-0000-0000-0000-000000000002'
          and (tests.task('bilen')).reward_nok = 20 and (tests.task('bilen')).archived_at is null,
  'ikke gjort: engangsoppgave til barnet med 20 kr');
select is((select count(*)::int from public.task_completions where task_id = tests.id('bilen-task')), 0,
  'ingen avkrysning ennå');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select ok(exists (select 1 from public.today_tasks where id = tests.id('bilen-task')),
  'oppgaven står i barnets «I dag»');
select is((select status from public.complete_task(tests.id('bilen-task'), 'aaaaaaaa-0000-0000-0000-000000000002')),
  'pending'::public.completion_status, 'barnet krysser av: lønnen venter som vanlig');
select is((select status from public.list_my_task_proposals() where id = tests.id('bilen')),
  'approved'::public.proposal_status, 'barnet ser at forslaget er godkjent');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is(public.approve_completions(array[(tests.completion('bilen')).id]), 1, 'voksen godkjenner avkrysningen');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '50/0/30/20', 'saldo: 20 kr til');
select tests.logout();

-- ===========================================================================
-- 8. Avslag
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select tests.decide('nei', false)$$, 'voksen avslår');
select ok((tests.proposal('nei')).status = 'rejected' and (tests.proposal('nei')).task_id is null,
  'avslått: ingen oppgave');
select throws_ok(format('select public.decide_task_proposal(%L, true)', tests.id('nei')),
  'P0001', 'not_pending', 'et avgjort forslag kan ikke avgjøres igjen');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select is((select status from public.list_my_task_proposals() where id = tests.id('nei')),
  'rejected'::public.proposal_status, 'barnet ser avslaget');
select lives_ok($$select tests.submit('ny', 'Bære ved', true, false)$$,
  'etter avgjørelser er det plass til nye forslag');
select tests.logout();

-- ===========================================================================
-- 8b. Alle voksne, og hvor godkjente forslag vises
-- ===========================================================================
-- Voksen nr. 2 (ikke den som laget husstanden) ser forslagene og kan avgjøre.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select tests.submit('a3', 'Tømt søpla', true, true, 10);
select tests.submit('oppvask', 'Ta oppvasken', false, false);
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a003');
select is((select count(*)::int from public.task_proposals where status = 'pending'), 4,
  'voksen nr. 2 ser forslagene som venter');
select lives_ok($$select tests.decide('a3', true, 10)$$, 'voksen nr. 2 godkjenner et forslag');
select lives_ok($$select tests.decide('oppvask', true)$$, 'voksen nr. 2 godkjenner et «vil gjøre»-forslag');
select is((select reward_nok || ' ' || recurrence_type || ' ' || completed_by_member_id
           from public.today_completions where task_id = tests.id('hagen-task')),
  '30 job aaaaaaaa-0000-0000-0000-000000000002',
  'godkjent og gjort står i dagens avkrysninger: barnet, engangsjobb, 30 kr');
select tests.logout();

-- Familieskjermen får avkrysningen med barnet og beløpet (legges i barnets kort, se board.test.ts).
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select ok(exists (
    select 1 from jsonb_array_elements(public.get_family_board() -> 'completions') c
    where c ->> 'task_id' = tests.id('hagen-task')::text
      and c ->> 'completed_by_member_id' = 'aaaaaaaa-0000-0000-0000-000000000002'
      and (c ->> 'reward_nok')::int = 30
      and c ->> 'recurrence_type' = 'job'),
  'familieskjermen ser det godkjente forslaget som utført av barnet, med 30 kr');
select tests.logout();

-- Godkjent, ikke gjort: blir stående når avkrysningen angres eller fjernes.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
insert into tests.ids select 'oppvask-c1', r.completion_id
  from public.complete_task(tests.id('oppvask-task'), 'aaaaaaaa-0000-0000-0000-000000000002') r;
select ok(not exists (select 1 from public.today_tasks where id = tests.id('oppvask-task')),
  'krysset av: ikke lenger åpen i «I dag»');
select lives_ok(format('select public.undo_completion(%L)', tests.id('oppvask-c1')), 'barnet angrer');
select ok(exists (select 1 from public.today_tasks
                  where id = tests.id('oppvask-task') and assigned_member_id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  'etter angring står oppgaven i barnets «I dag» igjen');
insert into tests.ids select 'oppvask-c2', r.completion_id
  from public.complete_task(tests.id('oppvask-task'), 'aaaaaaaa-0000-0000-0000-000000000002') r;
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(format('select public.remove_completion(%L)', tests.id('oppvask-c2')), 'voksen trykker «Ikke gjort»');
select tests.logout();
select ok((tests.task('oppvask')).archived_at is null
          and exists (select 1 from public.today_tasks where id = tests.id('oppvask-task')),
  'etter «Ikke gjort» står oppgaven i «I dag» igjen, ikke arkivert');

-- ===========================================================================
-- 9. Hvem kan avgjøre, og ingen direkte skriving
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select throws_ok(format('select public.decide_task_proposal(%L, true)', tests.id('ny')),
  'P0001', 'not_adult', 'barnet kan ikke avgjøre');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select throws_ok(format('select public.decide_task_proposal(%L, true)', tests.id('ny')),
  'P0001', 'not_adult', 'familieskjermen kan ikke avgjøre');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok(format('select public.decide_task_proposal(%L, true)', tests.id('ny')),
  'P0001', 'not_adult', 'en voksen i en annen husstand kan ikke avgjøre');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.decide_task_proposal(gen_random_uuid(), true)$$,
  'P0001', 'not_adult', 'ukjent id gir samme feil');
select throws_ok(format('select public.decide_task_proposal(%L, true, 10001)', tests.id('ny')),
  'P0001', 'invalid_amount', 'beløp over 10 000 avvises');
select throws_ok($$insert into public.task_proposals (household_id, member_id, title, is_done, wants_reward)
                   values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-000000000002', 'X', true, false)$$,
  '42501', null, 'ingen kan sette inn direkte');
select throws_ok(format('update public.task_proposals set status = %L where id = %L', 'approved', tests.id('ny')),
  '42501', null, 'ingen kan endre direkte');
select throws_ok(format('delete from public.task_proposals where id = %L', tests.id('ny')),
  '42501', null, 'ingen kan slette direkte');
select tests.logout();

-- ===========================================================================
-- 10. Avgjorte forslag forsvinner fra barnets liste etter 3 dager
-- ===========================================================================
update public.task_proposals set decided_at = now() - interval '4 days' where id = tests.id('nei');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select ok(not exists (select 1 from public.list_my_task_proposals() where id = tests.id('nei')),
  'avgjort for 4 dager siden vises ikke');
select ok(exists (select 1 from public.list_my_task_proposals() where id = tests.id('boden')),
  'avgjort i dag vises');
select tests.logout();

-- ===========================================================================
-- 11. Innstillingen
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
update public.households set child_proposals_enabled = false where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select tests.logout();
select ok((select child_proposals_enabled from public.households where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'barnet kan ikke slå av innstillingen');

select tests.login_as('00000000-0000-0000-0000-00000000a001');
update public.households set child_proposals_enabled = false where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select throws_ok($$select public.submit_task_proposal('Av', true, false)$$,
  'P0001', 'proposals_disabled', 'innstillingen av hindrer nye forslag');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select tests.decide('lang', false)$$, 'ventende forslag kan fortsatt avgjøres');
update public.households set child_proposals_enabled = true where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select tests.logout();

-- ===========================================================================
-- 12. Utløpt prøvetid
-- ===========================================================================
update public.households set trial_ends_at = now() - interval '1 day' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select throws_ok($$select public.submit_task_proposal('Utløpt', true, false)$$,
  'P0001', 'subscription_required', 'utløpt prøvetid: kan ikke sende');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok(format('select public.decide_task_proposal(%L, true)', tests.id('ny')),
  'P0001', 'subscription_required', 'utløpt prøvetid: kan ikke avgjøre');
select tests.logout();

update public.households set trial_ends_at = now() + interval '14 days' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- ===========================================================================
-- 13. Sletting
-- ===========================================================================
-- Barn A2 sender et forslag, og voksen A2 avgjør ett av A1 sine.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select tests.submit('a2', 'Mate katten', true, false);
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a003');
select tests.decide('ny', false);
select tests.logout();

-- En voksen sletter barnet.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
delete from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000004';
select tests.logout();
select is((select count(*)::int from public.task_proposals where member_id = 'aaaaaaaa-0000-0000-0000-000000000004'), 0,
  'forslagene slettes med barnet');

-- Voksen A2 sletter kontoen, voksen A er igjen.
select tests.login_as('00000000-0000-0000-0000-00000000a003');
select public.delete_my_account_data();
select tests.logout();
select ok((tests.proposal('ny')).id is not null and (tests.proposal('ny')).decided_by_member_id is null,
  'en av flere voksne sletter seg: forslaget består, decided_by blir null');

-- Siste voksne i C sletter kontoen.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000c002');
select tests.submit('c', 'Gå med hunden', true, false);
select tests.logout();
select tests.login_as('00000000-0000-0000-0000-00000000c001');
select public.delete_my_account_data();
select tests.logout();
select is((select count(*)::int from public.task_proposals where household_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 0,
  'siste voksne sletter seg: forslagene slettes med husstanden');

-- ===========================================================================
-- 14. Opprydding etter 30 dager
-- ===========================================================================
update public.task_proposals set decided_at = now() - interval '31 days' where id = tests.id('nei');
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select tests.submit('gammel', 'Gammel', true, false);
select tests.logout();
update public.task_proposals set created_at = now() - interval '60 days' where id = tests.id('gammel');

select is(private.delete_old_task_proposals(), 1, 'ett avgjort forslag eldre enn 30 dager slettes');
select ok((tests.proposal('nei')).id is null, 'det gamle avslaget er borte');
select ok((tests.proposal('gammel')).id is not null and (tests.proposal('boden')).id is not null,
  'ventende (også gamle) og nyere avgjorte beholdes');
select ok(exists (select 1 from public.tasks where id = tests.id('boden-task')), 'oppgavene røres ikke');
select is((select schedule from cron.job where jobname = 'delete-old-task-proposals'), '15 3 * * *',
  'nattjobben finnes');
select ok(not has_function_privilege('authenticated', 'private.delete_old_task_proposals(timestamptz)', 'execute'),
  'innloggede kan ikke kjøre oppryddingen');

select * from finish();
rollback;
