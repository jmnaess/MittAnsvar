-- Tester for familieskjermen: kobling, hva skjermen kan og ikke kan, og sletting.
-- Se docs/DATABASE.md §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(105);

-- ---------------------------------------------------------------------------
-- Testhjelpere
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

create table tests.codes (name text primary key, code text, expires_at timestamptz);
create table tests.res (name text primary key, completion_id uuid, status text, reward int);
grant all on tests.codes, tests.res to authenticated;

create function tests.new_code(p_name text, p_household uuid)
returns void language plpgsql as $$
begin
  insert into tests.codes
  select p_name, r.code, r.expires_at from public.create_display_link_token(p_household) r;
end;
$$;

create function tests.code(p_name text)
returns text language sql as $$ select code from tests.codes where name = p_name $$;

create function tests.complete(p_name text, p_task uuid, p_member uuid)
returns void language plpgsql as $$
begin
  insert into tests.res
  select p_name, r.completion_id, r.status::text, r.reward_nok
  from public.complete_task(p_task, p_member) r;
end;
$$;

create function tests.cid(p_name text)
returns uuid language sql as $$ select completion_id from tests.res where name = p_name $$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksne A1 og A2, barn K (har enhet) og L. B: voksen B1, barn M.
--   d001 = skjerm i A, d002 = skjerm 2 i A, d003 = skjerm i B, d004 = gjetter.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'a1@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', 'a2@example.com', false),
  ('00000000-0000-0000-0000-00000000a003', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'b1@example.com', false),
  ('00000000-0000-0000-0000-00000000d001', null, true),
  ('00000000-0000-0000-0000-00000000d002', null, true),
  ('00000000-0000-0000-0000-00000000d003', null, true),
  ('00000000-0000-0000-0000-00000000d004', null, true);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hjem A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hjem B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'A1', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'A2', 'cat',  null, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'K',  'owl',  2016, '00000000-0000-0000-0000-00000000a003'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'L',  'frog', 2014, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'B1', 'bear', null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'M',  'bear', 2015, null);

-- Oppgaver. Tittelen sier hva de er. Alle daglige er i «I dag» med en gang.
insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type, recurrence_unit,
                          recurrence_every, reward_nok, description) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Felles',     null, 'interval', 'day', 1, null, 'hemmelig beskrivelse'),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Til K lønn', 'aaaaaaaa-0000-0000-0000-000000000003', 'interval', 'day', 1, 20, null),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Til A1',     'aaaaaaaa-0000-0000-0000-000000000001', 'interval', 'day', 1, null, null),
  ('bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Oppgave B',  null, 'interval', 'day', 1, null, null);

insert into public.tasks (id, household_id, title, recurrence_type, job_repeats, job_member_ids, reward_nok) values
  ('aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jobb for L', 'job', true, array['aaaaaaaa-0000-0000-0000-000000000004']::uuid[], 10);

-- ===========================================================================
-- 1. Kobling
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select tests.new_code('a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'en voksen kan lage en skjermkode');
select is(char_length(tests.code('a')), 8, 'koden har 8 tegn');
select ok((select expires_at between now() + interval '9 minutes' and now() + interval '11 minutes'
           from tests.codes where name = 'a'), 'koden utløper etter 10 minutter');
select lives_ok($$select tests.new_code('a-old-check', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'en ny kode kan lages');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d004');
select is(public.redeem_link_token(tests.code('a')), null, 'en eldre skjermkode gjelder ikke lenger');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a003');
select throws_ok($$select public.create_display_link_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'P0001', 'not_adult', 'et barn kan ikke lage skjermkode');
select throws_ok(format('select public.redeem_link_token(%L)', tests.code('a-old-check')),
  'P0001', 'already_in_household', 'et koblet barn kan ikke bli skjerm');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok($$select public.create_display_link_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'P0001', 'not_adult', 'en annen husstand kan ikke lage skjermkode');
select lives_ok($$select tests.new_code('b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  'voksen B lager kode til sin husstand');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(format('select public.redeem_link_token(%L)', tests.code('a-old-check')),
  'P0001', 'anonymous_required', 'en e-postbruker kan ikke bli skjerm');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select is(public.get_family_board(), null, 'uten kobling gir tavla null');
select is(public.redeem_link_token(lower(tests.code('a-old-check'))),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'skjermen kobles med koden');
select throws_ok(format('select public.redeem_link_token(%L)', tests.code('b')),
  'P0001', 'already_in_household', 'en skjerm kan ikke kobles på nytt');
select tests.logout();

select is((select count(*)::int from public.household_displays
           where auth_user_id = '00000000-0000-0000-0000-00000000d001'), 1, 'skjermraden finnes');
select is((select count(*)::int from public.members
           where auth_user_id = '00000000-0000-0000-0000-00000000d001'), 0, 'skjermen er ikke et medlem');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d002');
select is(public.redeem_link_token(tests.code('a-old-check')), null, 'koden virker bare én gang');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d003');
select is(public.redeem_link_token(tests.code('b')),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'skjerm i husstand B');
select tests.logout();

-- Sperren mot gjetting og utløp.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select tests.new_code('a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select tests.logout();
update public.link_tokens set expires_at = now() - interval '1 minute'
where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and member_id is null and used_at is null;
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d002');
select is(public.redeem_link_token(tests.code('a2')), null, 'utløpt kode gir null');
select tests.logout();
update public.link_tokens set expires_at = now() + interval '5 minutes'
where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and member_id is null and used_at is null;
insert into public.link_attempts (user_id)
select '00000000-0000-0000-0000-00000000d004' from generate_series(1, 5);
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d004');
select throws_ok(format('select public.redeem_link_token(%L)', tests.code('a2')),
  'P0001', 'too_many_attempts', 'sperren gjelder også skjermkoder');
select tests.logout();
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d002');
select ok(public.redeem_link_token(tests.code('a2')) is not null, 'skjerm 2 kobles');
select tests.logout();

-- Voksne ser skjermene i egen husstand, uten bruker-id.
select tests.login_as('00000000-0000-0000-0000-00000000a002');
select is((select count(*)::int from public.household_displays), 2, 'voksen ser egne skjermer');
select throws_ok($$select auth_user_id from public.household_displays$$, '42501', null,
  'voksne kan ikke lese skjermens bruker-id');
select throws_ok($$delete from public.household_displays$$, '42501', null, 'skjermrader kan ikke slettes direkte');
select tests.logout();
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a003');
select is((select count(*)::int from public.household_displays), 0, 'barn ser ingen skjermer');
select tests.logout();
select tests.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*)::int from public.household_displays), 1, 'annen husstand ser bare sin egen');
select tests.logout();

-- ===========================================================================
-- 2. Tavla
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select is(public.get_family_board() ->> 'household_name', 'Hjem A', 'tavla har husstandens navn');
select is(jsonb_array_length(public.get_family_board() -> 'members'), 4, 'alle fire medlemmer');
select is(jsonb_array_length(public.get_family_board() -> 'tasks'), 4, 'bare egne oppgaver (ikke husstand B)');
select ok(public.get_family_board()::text !~ 'Oppgave B', 'ingenting fra husstand B');
select ok(public.get_family_board()::text !~ 'birth_year', 'ikke fødselsår');
select ok(public.get_family_board()::text !~ 'auth_user_id', 'ikke auth_user_id');
select ok(public.get_family_board()::text ~ 'hemmelig', 'beskrivelsen er med («Slik gjør du»)');
select ok(public.get_family_board()::text !~ '00000000-0000-0000-0000-00000000a00', 'ingen voksnes bruker-id');

-- Ingen direkte lesing.
select is((select count(*)::int from public.households), 0, 'ser ingen husstander');
select is((select count(*)::int from public.members), 0, 'ser ingen medlemmer');
select is((select count(*)::int from public.tasks), 0, 'ser ingen oppgaver');
select is((select count(*)::int from public.today_tasks), 0, 'today_tasks er tomt');
select is((select count(*)::int from public.task_completions), 0, 'ser ingen avkrysninger');
select is((select count(*)::int from public.today_completions), 0, 'today_completions er tomt');
select is((select count(*)::int from public.recent_completions), 0, 'recent_completions er tomt');
select is((select count(*)::int from public.payouts), 0, 'ser ingen utbetalinger');
select is((select count(*)::int from public.member_balances), 0, 'ser ingen saldo');
select is((select count(*)::int from public.household_displays), 0, 'ser ikke skjermlisten');
select tests.logout();

-- ===========================================================================
-- 3. Avkrysning og angring
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select lives_ok($$select tests.complete('felles', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004')$$,
  'felles oppgave kan krysses av for et barn');
select is((select status from tests.res where name = 'felles'), 'approved', 'uten lønn: godkjent');
select throws_ok($$select tests.complete('x', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004')$$,
  'P0001', 'task_not_due', 'en oppgave som er gjort, kan ikke krysses av igjen');

select throws_ok($$select tests.complete('x', 'aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004')$$,
  'P0001', 'invalid_member', 'en oppgave til K kan ikke krysses av for L');
select lives_ok($$select tests.complete('lonn', 'aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'oppgave til K krysses av for K');
select is((select status from tests.res where name = 'lonn'), 'pending', 'lønn: venter på godkjenning');
select is((select reward from tests.res where name = 'lonn'), 20, 'beløpet lagres');

select lives_ok($$select tests.complete('voksen', 'aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'oppgave til en voksen krysses av for den voksne');

select throws_ok($$select tests.complete('x', 'aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'P0001', 'invalid_member', 'jobb for L kan ikke tas av K');
select throws_ok($$select tests.complete('x', 'aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'P0001', 'invalid_member', 'jobb kan ikke tas av en voksen');
select lives_ok($$select tests.complete('jobb', 'aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000004')$$,
  'jobb for L tas av L');
select is((select status from tests.res where name = 'jobb'), 'pending', 'jobb med lønn venter');

select throws_ok($$select tests.complete('x', 'bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')$$,
  'P0001', 'task_not_found', 'oppgave i en annen husstand finnes ikke for skjermen');
select throws_ok($$select tests.complete('x', 'aaaaaaaa-1111-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')$$,
  'P0001', 'invalid_member', 'en person fra en annen husstand avvises');

select is(jsonb_array_length(public.get_family_board() -> 'completions'), 4, 'dagens avkrysninger er på tavla');
select is((select count(*)::int from jsonb_array_elements(public.get_family_board() -> 'completions') e
           where e ->> 'recorded_by' = '00000000-0000-0000-0000-00000000d001'), 4, 'egne avkrysninger har recorded_by');

select lives_ok(format('select public.undo_completion(%L)', tests.cid('felles')), 'skjermen angrer egen avkrysning');
select is((select count(*)::int from jsonb_array_elements(public.get_family_board() -> 'tasks') e
           where e ->> 'title' = 'Felles'), 1, 'oppgaven er tilbake i «I dag»');
select tests.logout();

-- Avkrysning fra en voksen: tavla viser den uten bruker-id, og skjermen kan ikke angre den.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select tests.complete('fra-voksen', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
select tests.logout();
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select ok((select e -> 'recorded_by' = 'null'::jsonb
           from jsonb_array_elements(public.get_family_board() -> 'completions') e
           where e ->> 'id' = tests.cid('fra-voksen')::text), 'andres recorded_by skjules');
select throws_ok(format('select public.undo_completion(%L)', tests.cid('fra-voksen')),
  'P0001', 'undo_not_allowed', 'skjermen kan ikke angre det en voksen registrerte');
select tests.logout();

-- En annen skjerm i samme husstand kan heller ikke angre.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d002');
select throws_ok(format('select public.undo_completion(%L)', tests.cid('lonn')),
  'P0001', 'undo_not_allowed', 'en annen skjerm kan ikke angre');
select tests.logout();

-- Skjerm i husstand B når ikke husstand A.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d003');
select throws_ok(format('select public.undo_completion(%L)', tests.cid('lonn')),
  'P0001', 'completion_not_found', 'annen husstands skjerm får completion_not_found');
select tests.logout();

-- Tidsgrensen.
update public.task_completions set completed_at = now() - interval '11 minutes' where id = tests.cid('voksen');
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select throws_ok(format('select public.undo_completion(%L)', tests.cid('voksen')),
  'P0001', 'undo_expired', 'angring etter 10 minutter avvises');
select tests.logout();

-- Utløpt prøvetid.
update public.households set trial_ends_at = now() - interval '1 day' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d003');
select throws_ok($$select tests.complete('x', 'bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')$$,
  'P0001', 'subscription_required', 'utløpt prøvetid stopper avkrysning');
select is(jsonb_array_length(public.get_family_board() -> 'tasks'), 1, 'tavla vises fortsatt');
select tests.logout();

-- ===========================================================================
-- 4. Det skjermen ikke kan
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select throws_ok(format('select public.approve_completions(array[%L]::uuid[])', tests.cid('lonn')),
  'P0001', 'not_adult', 'kan ikke godkjenne');
select throws_ok(format('select public.reject_completion(%L)', tests.cid('lonn')),
  'P0001', 'not_adult', 'kan ikke avvise');
select throws_ok(format($$select public.set_completion_status(%L, 'rejected')$$, tests.cid('lonn')),
  'P0001', 'not_adult', 'kan ikke endre status');
select throws_ok(format('select public.remove_completion(%L)', tests.cid('lonn')),
  'P0001', 'not_adult', 'kan ikke fjerne avkrysning');
select throws_ok(format($$select public.reassign_completion(%L, 'aaaaaaaa-0000-0000-0000-000000000004')$$, tests.cid('lonn')),
  'P0001', 'not_adult', 'kan ikke flytte avkrysning');
select throws_ok($$select public.postpone_task('aaaaaaaa-1111-0000-0000-000000000001', current_date + 2)$$,
  'P0001', 'not_adult', 'kan ikke utsette');
select throws_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000003', 1)$$,
  'P0001', 'not_adult', 'kan ikke registrere utbetaling');
select throws_ok($$select public.create_link_token('aaaaaaaa-0000-0000-0000-000000000004')$$,
  'P0001', 'not_adult', 'kan ikke koble barn');
select throws_ok($$select public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'P0001', 'not_adult', 'kan ikke invitere');
select throws_ok($$select public.unlink_member_device('aaaaaaaa-0000-0000-0000-000000000003')$$,
  'P0001', 'not_adult', 'kan ikke koble fra et barn');
select throws_ok($$select public.unlink_display('aaaaaaaa-9999-0000-0000-000000000000')$$,
  'P0001', 'not_adult', 'kan ikke koble fra skjermer');
select throws_ok($$select public.set_my_avatar('fox')$$, 'P0001', 'member_not_found', 'har ingen avatar å endre');
select throws_ok($$select public.unlink_my_device()$$, 'P0001', 'invalid_member', 'er ikke en barneenhet');

-- Direkte skriving treffer null rader eller nektes.
select is_empty($$update public.households set name = 'x', has_garden = true returning id$$, 'kan ikke endre husstand eller hjemprofil');
select is_empty($$update public.members set display_name = 'x' returning id$$, 'kan ikke endre medlemmer');
select is_empty($$delete from public.members returning id$$, 'kan ikke slette medlemmer');
select is_empty($$update public.tasks set title = 'x' returning id$$, 'kan ikke endre oppgaver');
select throws_ok($$insert into public.tasks (household_id, title, recurrence_type)
                   values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'once')$$,
  '42501', null, 'kan ikke lage oppgaver');
select throws_ok($$delete from public.task_completions$$, '42501', null, 'kan ikke slette avkrysninger');
select throws_ok($$select * from public.link_tokens$$, '42501', null, 'kan ikke lese koder');
select tests.logout();

-- ===========================================================================
-- 5. Profilbilder
-- ===========================================================================
insert into storage.objects (bucket_id, name) values
  ('member-photos', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/aaaaaaaa-0000-0000-0000-000000000003/11111111-1111-1111-1111-111111111111.jpg'),
  ('member-photos', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/aaaaaaaa-0000-0000-0000-000000000004/22222222-2222-2222-2222-222222222222.jpg'),
  ('member-photos', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/bbbbbbbb-0000-0000-0000-000000000002/33333333-3333-3333-3333-333333333333.jpg');
update public.members set avatar_mode = 'photo',
  photo_path = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/aaaaaaaa-0000-0000-0000-000000000003/11111111-1111-1111-1111-111111111111.jpg'
where id = 'aaaaaaaa-0000-0000-0000-000000000003';
update public.members set avatar_mode = 'figure',
  photo_path = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/aaaaaaaa-0000-0000-0000-000000000004/22222222-2222-2222-2222-222222222222.jpg'
where id = 'aaaaaaaa-0000-0000-0000-000000000004';
update public.members set avatar_mode = 'photo',
  photo_path = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/bbbbbbbb-0000-0000-0000-000000000002/33333333-3333-3333-3333-333333333333.jpg'
where id = 'bbbbbbbb-0000-0000-0000-000000000002';

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d001');
select is((select array_agg(name::text) from storage.objects where bucket_id = 'member-photos'),
  array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/aaaaaaaa-0000-0000-0000-000000000003/11111111-1111-1111-1111-111111111111.jpg'],
  'skjermen leser bare bilder som vises i egen husstand');
select is((select count(*)::int from jsonb_array_elements(public.get_family_board() -> 'members') e
           where e ->> 'photo_path' is not null), 1, 'tavla har bare stien til bilder som vises');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('member-photos',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/aaaaaaaa-0000-0000-0000-000000000003/44444444-4444-4444-4444-444444444444.jpg')$$,
  '42501', null, 'kan ikke laste opp');
-- Slik sletter Storage-API-et. Uten innstillingen stopper storage.protect_delete all DELETE.
set local storage.allow_delete_query = 'true';
select is_empty($$delete from storage.objects where bucket_id = 'member-photos' returning id$$, 'kan ikke slette bilder');
select tests.logout();

-- ===========================================================================
-- 6. Frakobling og sletting
-- ===========================================================================
create function tests.display_id(uid uuid)
returns uuid language sql security definer as
$$ select id from public.household_displays where auth_user_id = uid $$;
grant execute on function tests.display_id(uuid) to authenticated;

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok(format('select public.unlink_display(%L)', tests.display_id('00000000-0000-0000-0000-00000000d002')),
  'P0001', 'not_adult', 'en annen husstand kan ikke koble fra');
select tests.logout();
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a003');
select throws_ok(format('select public.unlink_display(%L)', tests.display_id('00000000-0000-0000-0000-00000000d002')),
  'P0001', 'not_adult', 'et barn kan ikke koble fra');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a002');
select lives_ok(format('select public.unlink_display(%L)', tests.display_id('00000000-0000-0000-0000-00000000d002')),
  'en voksen kobler fra');
select tests.logout();
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000d002'), 0,
  'den anonyme brukeren er slettet');
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000d002');
select is(public.get_family_board(), null, 'den gamle sesjonen får ingen tavle');
select tests.logout();

-- En voksen sletter seg, en annen er igjen: skjermen består.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select public.delete_my_account_data();
select tests.logout();
select is((select count(*)::int from public.household_displays
           where auth_user_id = '00000000-0000-0000-0000-00000000d001'), 1,
  'skjermen består når en av de voksne sletter seg');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000d001'), 1,
  'skjermens bruker består');

-- Siste voksne sletter seg: alt forsvinner, men bare anonyme brukere slettes.
select tests.login_as('00000000-0000-0000-0000-00000000a002');
select public.delete_my_account_data();
select tests.logout();
select is((select count(*)::int from public.household_displays
           where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0, 'skjermraden er borte med husstanden');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000d001'), 0,
  'skjermens anonyme bruker er slettet');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000a003'), 0,
  'barnets anonyme bruker er slettet');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000a002'), 1,
  'e-postkontoen slettes ikke her (det gjør Edge Function)');
select is((select count(*)::int from public.household_displays
           where household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 1, 'den andre husstandens skjerm består');

-- Å slette brukeren direkte fjerner også koblingen.
delete from auth.users where id = '00000000-0000-0000-0000-00000000d003';
select is((select count(*)::int from public.household_displays), 0, 'slettet bruker fjerner skjermraden');

select * from finish();
rollback;
