-- Tester for barnets egne oppgaver uten lønn (add_own_task) og today_completions.task_created_by.
-- Se docs/DATABASE.md (tasks, task_proposals) og §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(50);

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

-- Oppgaver og avkrysninger lagres under «<navn>-task» og «<navn>-c».
create table tests.ids (name text primary key, id uuid);
grant all on tests.ids to authenticated;

create function tests.add(p_name text, p_title text, p_done boolean)
returns void language plpgsql as $$
declare
  r record;
begin
  select * into r from public.add_own_task(p_title, p_done);
  insert into tests.ids values (p_name || '-task', r.task_id), (p_name || '-c', r.completion_id);
end;
$$;

create function tests.id(p_name text)
returns uuid language sql as $$ select id from tests.ids where name = p_name $$;

-- Lest som postgres (uten RLS).
create function tests.task(p_name text)
returns public.tasks language sql security definer as $$
  select * from public.tasks where id = tests.id(p_name || '-task')
$$;

create function tests.completion(p_name text)
returns public.task_completions language sql security definer as $$
  select * from public.task_completions where task_id = tests.id(p_name || '-task')
$$;

create function tests.proposal_count()
returns int language sql security definer as $$ select count(*)::int from public.task_proposals $$;

create function tests.bal(p_member uuid)
returns text language sql as $$
  select earned_nok || '/' || pending_nok || '/' || paid_nok || '/' || balance_nok
  from public.member_balances where member_id = p_member
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A (a001), barn A1 med enhet (a002), barn A2 med enhet (a004), familieskjerm (d001).
--   B: voksen B (b001), barn B med enhet (b002).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000a004', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false),
  ('00000000-0000-0000-0000-00000000b002', null, true),
  ('00000000-0000-0000-0000-00000000d001', null, true);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A1',  'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A2',  'frog', 2018, '00000000-0000-0000-0000-00000000a004'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'bear', 2015, '00000000-0000-0000-0000-00000000b002');

insert into public.household_displays (household_id, auth_user_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-00000000d001');

-- ===========================================================================
-- 1. «Legg til»: vil gjøre, uten lønn → engangsoppgave til barnet i dag
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select lives_ok($$select tests.add('lese', '  Lese 20 minutter  ', false)$$, 'barnet legger til en oppgave');
select ok(exists (select 1 from public.today_tasks where id = tests.id('lese-task')),
  'oppgaven står i barnets «I dag»');
select tests.logout();

select ok((tests.task('lese')).recurrence_type = 'once'
          and (tests.task('lese')).once_on = private.household_today('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
          and (tests.task('lese')).assigned_member_id = 'aaaaaaaa-0000-0000-0000-000000000002'
          and (tests.task('lese')).archived_at is null,
  'engangsoppgave til barnet for i dag');
select is((tests.task('lese')).title, 'Lese 20 minutter', 'tittelen er trimmet');
select is((tests.task('lese')).reward_nok, null, 'ingen lønn');
select is((tests.task('lese')).created_by, 'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
  'created_by er barnet');
select is(tests.id('lese-c'), null, 'ingen avkrysning returnert');
select is((select count(*)::int from public.task_completions where task_id = tests.id('lese-task')), 0,
  'ingen avkrysning lagret');
select is(tests.proposal_count(), 0, 'ingen rad i task_proposals');

-- ===========================================================================
-- 2. «Registrer»: gjort, uten lønn → utført av barnet med en gang
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select lives_ok($$select tests.add('rommet', 'Ryddet rommet', true)$$, 'barnet registrerer noe som er gjort');
select ok((select feedback_kind from public.add_own_task('Ryddet gangen', true)) is not null,
  'resultatet har tekstgruppe til feiringen');
select tests.logout();

select ok((tests.task('rommet')).recurrence_type = 'job' and not (tests.task('rommet')).job_repeats
          and (tests.task('rommet')).archived_at is not null
          and (tests.task('rommet')).job_member_ids = array['aaaaaaaa-0000-0000-0000-000000000002'::uuid],
  'gjort: arkivert engangsjobb bare for barnet');
select ok((tests.task('rommet')).reward_nok is null
          and (tests.task('rommet')).created_by = 'aaaaaaaa-0000-0000-0000-000000000002',
  'uten lønn, created_by er barnet');
select is((tests.completion('rommet')).id, tests.id('rommet-c'), 'returnert completion_id er avkrysningen');
select is((tests.completion('rommet')).completed_by_member_id, 'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
  'utføreren er barnet');
select is((tests.completion('rommet')).recorded_by, '00000000-0000-0000-0000-00000000a002'::uuid,
  'registrert av barnets enhet');
select ok((tests.completion('rommet')).status = 'approved' and (tests.completion('rommet')).reward_nok is null,
  'godkjent, uten beløp');
select is(tests.proposal_count(), 0, 'fortsatt ingen rad i task_proposals');

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select is(tests.bal('aaaaaaaa-0000-0000-0000-000000000002'), '0/0/0/0', 'saldoen er uendret');

-- ===========================================================================
-- 3. Voksne og familieskjermen ser det
-- ===========================================================================
select is((select task_created_by from public.today_completions where task_id = tests.id('rommet-task')),
  'aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'today_completions: task_created_by er barnet');
select is((select created_by from public.today_tasks where id = tests.id('lese-task')),
  'aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'today_tasks: created_by er barnet');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select ok(exists (
    select 1 from jsonb_array_elements(public.get_family_board() -> 'completions') c
    where c ->> 'task_id' = tests.id('rommet-task')::text
      and c ->> 'completed_by_member_id' = 'aaaaaaaa-0000-0000-0000-000000000002'
      and c ->> 'recurrence_type' = 'job'
      and c ->> 'reward_nok' is null),
  'familieskjermen ser avkrysningen som utført av barnet (barnets kort), uten lønn');
select tests.logout();

-- ===========================================================================
-- 4. Bare til seg selv, aldri med lønn
-- ===========================================================================
select has_function('public', 'add_own_task', array['text', 'boolean'], 'add_own_task(text, boolean) finnes');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'add_own_task'), 1,
  'ingen variant med medlem eller beløp');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select throws_ok($$insert into public.tasks (household_id, title, assigned_member_id, recurrence_type, reward_nok)
                   values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Til søsken',
                           'aaaaaaaa-0000-0000-0000-000000000004', 'once', 50)$$,
  '42501', null, 'barnet kan ikke sette inn oppgaver direkte (til andre eller med lønn)');
update public.tasks set reward_nok = 50, assigned_member_id = 'aaaaaaaa-0000-0000-0000-000000000004'
where id = tests.id('lese-task');
select throws_ok($$select public.submit_task_proposal('Uten lønn', true, false)$$,
  'P0001', 'reward_required', 'forslag uten lønn avvises');
select tests.logout();
select ok((tests.task('lese')).reward_nok is null
          and (tests.task('lese')).assigned_member_id = 'aaaaaaaa-0000-0000-0000-000000000002',
  'barnet kan ikke gi egen oppgave lønn eller flytte den');

-- ===========================================================================
-- 5. Hvem kan kalle
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select * from public.add_own_task('Voksen', false)$$,
  'P0001', 'not_child', 'en voksen kan ikke bruke add_own_task');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select throws_ok($$select * from public.add_own_task('Skjerm', true)$$,
  'P0001', 'not_child', 'familieskjermen kan ikke bruke add_own_task');
select tests.logout();

select set_config('role', 'anon', true);
select throws_ok($$select * from public.add_own_task('Anon', false)$$, '42501', null,
  'anon kan ikke bruke add_own_task');
select tests.logout();

-- ===========================================================================
-- 6. Ugyldig tittel
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select throws_ok($$select * from public.add_own_task('   ', false)$$,
  'P0001', 'invalid_title', 'tom tittel avvises');
select throws_ok(format('select * from public.add_own_task(%L, false)', repeat('x', 61)),
  'P0001', 'invalid_title', 'tittel på 61 tegn avvises');
select throws_ok($$select * from public.add_own_task('Uten svar', null)$$,
  'P0001', 'invalid_title', '«Er det gjort?» må være svart');
select tests.logout();

-- ===========================================================================
-- 7. Voksne endrer og sletter, barnet angrer egen avkrysning
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
update public.tasks set title = 'Lese 30 minutter' where id = tests.id('lese-task');
update public.tasks set archived_at = now() where id = tests.id('lese-task');
select tests.logout();
select ok((tests.task('lese')).title = 'Lese 30 minutter' and (tests.task('lese')).archived_at is not null,
  'voksen kan endre og slette (arkivere) oppgaven barnet la inn');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select ok(not exists (select 1 from public.today_tasks where id = tests.id('lese-task')),
  'slettet: ikke lenger i barnets «I dag»');
select lives_ok(format('select public.undo_completion(%L)', tests.id('rommet-c')),
  'barnet angrer sin egen avkrysning');
select tests.logout();
select is((select count(*)::int from public.task_completions where task_id = tests.id('rommet-task')), 0,
  'avkrysningen er borte');

-- ===========================================================================
-- 8. Grensen på 10 per dag (A1 har 3: lese, rommet, gangen)
-- ===========================================================================
-- En oppgave fra et godkjent forslag har den voksne som created_by og teller ikke.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
insert into tests.ids values ('forslag', public.submit_task_proposal('Vasket bilen', true, true, 20));
select tests.logout();
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select isnt(public.decide_task_proposal(tests.id('forslag'), true, 20), null, 'voksen godkjenner et forslag');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select lives_ok($$select count(*) from generate_series(1, 7) g
                  cross join lateral public.add_own_task('Ekstra ' || g, g % 2 = 0)$$,
  '7 til går (10 i alt, også slettede og angrede teller)');
select throws_ok($$select * from public.add_own_task('Nummer elleve', false)$$,
  'P0001', 'too_many_own_tasks', 'nr. 11 samme dag avvises');
select throws_ok($$select * from public.add_own_task('Nummer elleve, gjort', true)$$,
  'P0001', 'too_many_own_tasks', 'grensen gjelder begge typer');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select lives_ok($$select * from public.add_own_task('Søskens egen', false)$$, 'søsken har sin egen grense');
select tests.logout();

-- ===========================================================================
-- 9. Innstillingen av, utløpt prøvetid
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
update public.households set child_proposals_enabled = false where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select throws_ok($$select * from public.add_own_task('Av', false)$$,
  'P0001', 'proposals_disabled', 'av: kan ikke legge til');
select throws_ok($$select * from public.add_own_task('Av, gjort', true)$$,
  'P0001', 'proposals_disabled', 'av: kan ikke registrere');
select tests.logout();

update public.households
set child_proposals_enabled = true, trial_ends_at = now() - interval '1 day'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select throws_ok($$select * from public.add_own_task('Utløpt', false)$$,
  'P0001', 'subscription_required', 'utløpt prøvetid: kan ikke legge til');
select tests.logout();

update public.households set trial_ends_at = now() + interval '14 days' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- ===========================================================================
-- 10. En annen husstand ser ingenting
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select lives_ok($$select tests.add('a2', 'Matet katten', true)$$, 'barn A2 registrerer noe');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*)::int from public.tasks where created_by in
           ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004')), 0,
  'voksen B ser ingen av oppgavene');
select is((select count(*)::int from public.today_completions where task_id = tests.id('a2-task')), 0,
  'voksen B ser ikke avkrysningen');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000b002');
select is((select count(*)::int from public.today_tasks where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0,
  'barn B ser ingen oppgaver i A');
select is((select count(*)::int from public.today_completions where task_id = tests.id('a2-task')), 0,
  'barn B ser ikke avkrysningen');
select tests.logout();

select * from finish();
rollback;
