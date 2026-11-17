-- Tester for steg 10a: barnas egen enhet (link_tokens, redeem_link_token, frakobling)
-- og innstrammingen for barn (avkrysning, saldo, avkrysninger og utbetalinger).
-- Se docs/DATABASE.md §1 og §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(53);

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

-- Barnets enhet logger inn anonymt. Supabase setter da is_anonymous = true i tokenet.
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

-- Kodene lagres under et navn, så de kan brukes senere i testen.
create table tests.codes (name text primary key, code text, expires_at timestamptz);
grant all on tests.codes to authenticated;

create function tests.new_code(p_name text, p_member uuid)
returns void language plpgsql as $$
begin
  insert into tests.codes
  select p_name, r.code, r.expires_at from public.create_link_token(p_member) r;
end;
$$;

create function tests.code(p_name text)
returns text language sql as $$ select code from tests.codes where name = p_name $$;

grant execute on all functions in schema tests to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A1 (kobles i testen), barn A2 (har enhet fra før).
--   B: voksen B, barn B.
--   Anonyme enheter: a002 (A1), a003 (A2), a004 og a006 (gjetter), og en e-postbruker
--   uten husstand (a005).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000a003', null, true),
  ('00000000-0000-0000-0000-00000000a004', null, true),
  ('00000000-0000-0000-0000-00000000a005', 'uten-husstand@example.com', false),
  ('00000000-0000-0000-0000-00000000a006', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A1',  'owl',  2016, null),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A2',  'frog', 2014, '00000000-0000-0000-0000-00000000a003'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'bear', 2015, null);

-- ===========================================================================
-- 1. Lage kode
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select lives_ok($$select tests.new_code('a1', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'en voksen kan lage en kode for et barn');
select is(char_length(tests.code('a1')), 8, 'koden har 8 tegn');
select ok((select expires_at between now() + interval '9 minutes' and now() + interval '11 minutes'
           from tests.codes where name = 'a1'),
  'koden utløper etter 10 minutter');

select throws_ok($$select * from public.link_tokens$$, '42501', null,
  'link_tokens kan ikke leses av klienten');
select throws_ok($$select public.create_link_token('aaaaaaaa-0000-0000-0000-000000000001')$$,
  'P0001', 'invalid_member', 'kan ikke lage kode for en voksen');
select throws_ok($$select public.create_link_token('aaaaaaaa-0000-0000-0000-000000000003')$$,
  'P0001', 'already_linked', 'kan ikke lage kode for et barn som allerede har enhet');
select tests.logout();

select is((select count(*)::int from public.link_tokens
           where code_hash = convert_to(tests.code('a1'), 'UTF8')), 0,
  'klarteksten er ikke lagret');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a003');
select throws_ok($$select public.create_link_token('aaaaaaaa-0000-0000-0000-000000000002')$$,
  'P0001', 'not_adult', 'et barn kan ikke lage kode');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok($$select public.create_link_token('aaaaaaaa-0000-0000-0000-000000000002')$$,
  'P0001', 'not_adult', 'en voksen i en annen husstand kan ikke lage kode');
select tests.logout();

select set_config('role', 'anon', true);
select throws_ok($$select public.redeem_link_token('ABCDEFGH')$$, '42501', null,
  'anon kan ikke kalle redeem_link_token');
select tests.logout();

-- ===========================================================================
-- 2. Løse inn kode
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a005');
select throws_ok(format('select public.redeem_link_token(%L)', tests.code('a1')),
  'P0001', 'anonymous_required', 'en e-postbruker kan ikke bli koblet som barn');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select is(public.redeem_link_token('ZZZZZZZZ'), null, 'feil kode gir null');
select tests.logout();
select is((select count(*)::int from public.link_attempts
           where user_id = '00000000-0000-0000-0000-00000000a004'), 1,
  'feil kode lagres som forsøk');

-- Små bokstaver og bindestrek virker (samme normalisering som invitasjoner).
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select is(public.redeem_link_token(lower(substr(tests.code('a1'), 1, 4) || '-' || substr(tests.code('a1'), 5))),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'riktig kode gir husstandens id');
select is((select auth_user_id from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-00000000a002'::uuid, 'barneprofilen er koblet til den anonyme brukeren');
select is((select count(*)::int from public.households), 1, 'barnet ser sin husstand');
select throws_ok(format('select public.redeem_link_token(%L)', tests.code('a1')),
  'P0001', 'already_in_household', 'en koblet enhet kan ikke løse inn en kode til');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select is(public.redeem_link_token(tests.code('a1')), null, 'koden virker bare én gang');
select tests.logout();

-- Utløpt kode
select tests.login_as('00000000-0000-0000-0000-00000000b001');
select tests.new_code('b1', 'bbbbbbbb-0000-0000-0000-000000000002');
select tests.logout();
update public.link_tokens set expires_at = now() - interval '1 second'
where member_id = 'bbbbbbbb-0000-0000-0000-000000000002';

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a006');
select is(public.redeem_link_token(tests.code('b1')), null, 'en utløpt kode avvises');
select tests.logout();
select is((select auth_user_id from public.members where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  null, 'barn B er ikke koblet med utløpt kode');

-- Sperre: a004 har 2 feil. Tre til gir 5, og da avvises også en riktig kode.
select tests.login_as('00000000-0000-0000-0000-00000000b001');
select tests.new_code('b2', 'bbbbbbbb-0000-0000-0000-000000000002');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select public.redeem_link_token('ZZZZZZZZ');
select public.redeem_link_token('ZZZZZZZZ');
select public.redeem_link_token('ZZZZZZZZ');
select throws_ok(format('select public.redeem_link_token(%L)', tests.code('b2')),
  'P0001', 'too_many_attempts', 'sperre etter 5 feil, også for riktig kode');
select tests.logout();

-- Sperren slipper etter 15 minutter.
update public.link_attempts set attempted_at = now() - interval '16 minutes'
where user_id = '00000000-0000-0000-0000-00000000a004';
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a004');
select is(public.redeem_link_token(tests.code('b2')),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'sperren slipper etter 15 minutter');
select tests.logout();

-- ===========================================================================
-- 3. Avkrysning: et barn kan bare ta egne, felles og egne jobber
-- ===========================================================================
insert into public.tasks (id, household_id, title, assigned_member_id, recurrence_type,
                          recurrence_unit, recurrence_every, reward_nok, job_repeats, job_member_ids) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Eget rom',
   'aaaaaaaa-0000-0000-0000-000000000002', 'interval', 'day', 1, 10, false, '{}'),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Søskens rom',
   'aaaaaaaa-0000-0000-0000-000000000003', 'interval', 'day', 1, 10, false, '{}'),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Felles',
   null, 'interval', 'day', 1, null, false, '{}'),
  ('aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jobb for alle',
   null, 'job', null, null, 5, true, '{}'),
  ('aaaaaaaa-1111-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jobb for A1',
   null, 'job', null, null, 5, true, '{aaaaaaaa-0000-0000-0000-000000000002}'),
  ('aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jobb for A2',
   null, 'job', null, null, 5, true, '{aaaaaaaa-0000-0000-0000-000000000003}');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select lives_ok($$select public.complete_task('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'barnet kan krysse av sin egen oppgave');
select lives_ok($$select public.complete_task('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'barnet kan krysse av en felles oppgave');
select lives_ok($$select public.complete_task('aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'barnet kan ta en jobb for alle barna');
select lives_ok($$select public.complete_task('aaaaaaaa-1111-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'barnet kan ta en jobb for seg selv');
select throws_ok($$select public.complete_task('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'P0001', 'invalid_member', 'barnet kan ikke krysse av søskens oppgave');
select throws_ok($$select public.complete_task('aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'P0001', 'invalid_member', 'barnet kan ikke ta en jobb for et annet barn');
select throws_ok($$select public.complete_task('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'P0001', 'invalid_member', 'barnet kan ikke krysse av for søsken');
select tests.logout();

-- Søsken A2 tjener 10 kr og får 4 kr utbetalt.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a003');
select lives_ok($$select public.complete_task('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'søsken kan krysse av sin egen oppgave');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select public.record_payout('aaaaaaaa-0000-0000-0000-000000000003', 4)$$,
  'voksen registrerer utbetaling til søsken');
select lives_ok($$select public.complete_task('aaaaaaaa-1111-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'en voksen kan fortsatt registrere hva som helst');
select is((select count(*)::int from public.member_balances), 2, 'voksen ser begge barnas saldo');
select is((select count(*)::int from public.task_completions), 6, 'voksen ser alle avkrysninger');
select is((select count(*)::int from public.payouts), 1, 'voksen ser alle utbetalinger');
select tests.logout();

-- ===========================================================================
-- 4. Et barn ser bare sin egen saldo, egne avkrysninger og egne utbetalinger
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select is((select array_agg(member_id) from public.member_balances),
  array['aaaaaaaa-0000-0000-0000-000000000002'::uuid], 'barnet ser bare sin egen saldo');
select is((select balance_nok from public.member_balances), 25, 'barnets saldo stemmer (10 + 5 + 5 + 5)');
select is((select count(*)::int from public.task_completions
           where completed_by_member_id <> 'aaaaaaaa-0000-0000-0000-000000000002'), 0,
  'barnet ser ikke søskens avkrysninger');
select is((select count(*)::int from public.task_completions), 5, 'barnet ser sine egne avkrysninger');
select is((select count(*)::int from public.payouts), 0, 'barnet ser ikke søskens utbetalinger');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a003');
select is((select count(*)::int from public.payouts), 1, 'søsken ser sin egen utbetaling');
select is((select balance_nok from public.member_balances), 6, 'søskens saldo stemmer (10 − 4)');
select tests.logout();

-- ===========================================================================
-- 5. Frakobling
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a003');
select throws_ok($$select public.unlink_member_device('aaaaaaaa-0000-0000-0000-000000000002')$$,
  'P0001', 'not_adult', 'et barn kan ikke koble fra en enhet');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000b001');
select throws_ok($$select public.unlink_member_device('aaaaaaaa-0000-0000-0000-000000000002')$$,
  'P0001', 'not_adult', 'en annen husstand kan ikke koble fra');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.unlink_member_device('aaaaaaaa-0000-0000-0000-000000000001')$$,
  'P0001', 'invalid_member', 'en voksen kan ikke kobles fra');
select lives_ok($$select public.unlink_member_device('aaaaaaaa-0000-0000-0000-000000000002')$$,
  'en voksen kan koble fra barnets enhet');
select lives_ok($$select public.unlink_member_device('aaaaaaaa-0000-0000-0000-000000000002')$$,
  'frakobling kan kalles igjen');
select tests.logout();

select is((select auth_user_id from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  null, 'barneprofilen er ikke lenger koblet');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000a002'), 0,
  'den anonyme brukeren er slettet');
select is((select count(*)::int from public.task_completions
           where completed_by_member_id = 'aaaaaaaa-0000-0000-0000-000000000002'), 5,
  'barnets historikk består');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select is((select count(*)::int from public.households), 0, 'den gamle sesjonen ser ingen husstand');
select is((select count(*)::int from public.tasks), 0, 'den gamle sesjonen ser ingen oppgaver');
select tests.logout();

-- Etter frakobling kan barnet kobles til igjen.
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select tests.new_code('a1-igjen', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  'et frakoblet barn kan få en ny kode');
select tests.logout();

select * from finish();
rollback;
