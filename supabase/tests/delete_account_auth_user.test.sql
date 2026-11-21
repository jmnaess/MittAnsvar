-- Tester hele kontoslettingen slik delete-account gjør den: først delete_my_account_data(),
-- deretter slettes raden i auth.users (det gjør GoTrue med auth.admin.deleteUser).
-- Fanger opp en fremtidig fremmednøkkel mot auth.users eller members uten on delete-regel,
-- og viser at barnas historikk og saldo beholdes når en voksen sletter seg.
-- auth.users slettes som postgres: supabase_auth_admin kan ikke velges som rolle lokalt, og
-- fremmednøkkel-handlingene kjører uansett som eieren av tabellen. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- ---------------------------------------------------------------------------
-- Testhjelpere (samme som i adult_fix_completions.test.sql)
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

grant execute on all functions in schema tests to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata (som superbruker)
--   Husstand A: voksen A1 (sletter seg), voksen A2, barn K og L
--   Husstand B: voksen B1 (siste voksne, sletter seg), barn M
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a1@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', 'voksen-a2@example.com', false),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b1@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'A1', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'A2', 'cat',  null, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'K',  'owl',  2016, null),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'L',  'bear', 2014, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'B1', 'frog', null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'M',  'fox',  2015, null);

insert into public.tasks (id, household_id, title, recurrence_type, recurrence_unit,
                          recurrence_every, reward_nok) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rydde rommet',
   'interval', 'day', 1, 10),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lufte hunden',
   'interval', 'day', 1, 7),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rense sluk',
   'interval', 'month', 3, null),
  ('bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dekke bordet',
   'interval', 'day', 1, 5);

-- ===========================================================================
-- 1. A1 registrerer, flytter og gjør selv – og oppretter en oppgave og en utbetaling
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
-- A1 krysser av for K (recorded_by = A1).
select tests.complete('k_room', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003');
-- A1 krysser av for L, og flytter avkrysningen til K (recorded_by = A1 igjen).
select tests.complete('moved', 'aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004');
select public.reassign_completion(tests.cid('moved'), 'aaaaaaaa-0000-0000-0000-000000000003');
-- A1 gjør en oppgave selv.
select tests.complete('a1_own', 'aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001');
-- A1 lager en oppgave (created_by = A1) og registrerer en utbetaling til K.
insert into public.tasks (household_id, title, recurrence_type)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vaske vinduer', 'once');
select public.record_payout('aaaaaaaa-0000-0000-0000-000000000003', 5);
select tests.logout();

select is((select recorded_by from public.task_completions where id = tests.cid('moved')),
  '00000000-0000-0000-0000-00000000a001'::uuid,
  'før sletting: den flyttede avkrysningen er registrert av A1');

-- ===========================================================================
-- 2. A1 sletter kontoen (det finnes en annen voksen)
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select public.delete_my_account_data()$$, 'A1 kan slette sine data');
select tests.logout();

select lives_ok($$delete from auth.users where id = '00000000-0000-0000-0000-00000000a001'$$,
  'auth-brukeren til A1 kan slettes etterpå');

select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000a001'), 0,
  'auth-brukeren til A1 er borte');
select is((select count(*)::int from public.members where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 3,
  'A2, K og L finnes fortsatt');

-- Barnas historikk beholdes, uten kobling til den slettede brukeren.
select is((select count(*)::int from public.task_completions
           where id in (tests.cid('k_room'), tests.cid('moved'))), 2,
  'Ks avkrysninger (registrert og flyttet av A1) består');
select is((select count(*)::int from public.task_completions
           where id in (tests.cid('k_room'), tests.cid('moved')) and recorded_by is null), 2,
  'recorded_by er satt til null på Ks avkrysninger');
select is((select completed_by_member_id from public.task_completions where id = tests.cid('moved')),
  'aaaaaaaa-0000-0000-0000-000000000003'::uuid,
  'den flyttede avkrysningen tilhører fortsatt K');
select is((select coalesce(sum(reward_nok), 0)::int from public.task_completions
           where completed_by_member_id = 'aaaaaaaa-0000-0000-0000-000000000003' and status = 'approved')
         - (select coalesce(sum(amount_nok), 0)::int from public.payouts
            where member_id = 'aaaaaaaa-0000-0000-0000-000000000003'), 12,
  'Ks saldo er uendret (10 + 7 − 5)');
select is((select count(*)::int from public.task_completions where id = tests.cid('a1_own')), 0,
  'avkrysningen A1 gjorde selv er slettet med A1');

-- Oppgaven og utbetalingen består, uten kobling til A1.
select is((select created_by from public.tasks where title = 'Vaske vinduer'), null,
  'oppgaven A1 laget består, med created_by = null');
select is((select count(*)::int from public.payouts
           where member_id = 'aaaaaaaa-0000-0000-0000-000000000003' and recorded_by_member_id is null), 1,
  'utbetalingen til K består, med recorded_by_member_id = null');

-- ===========================================================================
-- 3. Siste voksne (B1) har krysset av for barnet og sletter kontoen
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000b001');
select tests.complete('m_table', 'bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');
select lives_ok($$select public.delete_my_account_data()$$, 'B1 kan slette sine data');
select tests.logout();

select is((select count(*)::int from public.households where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0,
  'husstand B er slettet');
select lives_ok($$delete from auth.users where id = '00000000-0000-0000-0000-00000000b001'$$,
  'auth-brukeren til B1 kan slettes etterpå');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000b001'), 0,
  'auth-brukeren til B1 er borte');

-- ===========================================================================
-- 4. Ingen fremmednøkkel mot auth.users mangler on delete-regel
-- ===========================================================================
select is((select count(*)::int from pg_constraint c
           where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
             and c.connamespace <> 'auth'::regnamespace
             and c.confdeltype not in ('c', 'n')), 0,
  'alle fremmednøkler mot auth.users har on delete cascade eller set null');

select * from finish();
rollback;
