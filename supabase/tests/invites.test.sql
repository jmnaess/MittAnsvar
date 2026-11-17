-- Tester for invitasjon av voksen: create_invite, accept_invite, sperre og RLS på invites.
-- Se migrasjonen *_invites.sql. Alt rulles tilbake til slutt.
begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

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

-- Antall rader en setning traff. Kjører som den innloggede, så RLS gjelder.
create function tests.rows_affected(q text)
returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- Klartekstkodene fra create_invite, så senere tester kan bruke dem.
create table tests.codes (name text primary key, code text, expires_at timestamptz);
grant all on tests.codes to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata (som superbruker)
--   A: husstand med voksen A1 og barn med egen (anonym) enhet C1
--   B: annen husstand med voksen B1
--   E: husstand med utløpt prøvetid, voksen E1
--   N1–N4: e-postbrukere uten husstand. X1: anonym bruker uten medlemskap.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', null),
  ('00000000-0000-0000-0000-0000000000e1', 'e1@example.com'),
  ('00000000-0000-0000-0000-0000000000f1', 'n1@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'n2@example.com'),
  ('00000000-0000-0000-0000-0000000000f3', 'n3@example.com'),
  ('00000000-0000-0000-0000-0000000000f4', 'n4@example.com'),
  ('00000000-0000-0000-0000-0000000000d1', null);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Familien A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Familien B', 'couple', 'apartment', now() + interval '14 days'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Utløpt',     'single', 'apartment', now() - interval '1 day');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'A1',   'fox',  null, '00000000-0000-0000-0000-0000000000a1'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn', 'frog', 2016, '00000000-0000-0000-0000-0000000000c1'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'B1',   'owl',  null, '00000000-0000-0000-0000-0000000000b1'),
  ('eeeeeeee-0000-0000-0000-0000000000e1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'adult', 'E1',   'cat',  null, '00000000-0000-0000-0000-0000000000e1');

insert into public.tasks (id, household_id, title, recurrence_type) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tømme søppel', 'once');

-- ===========================================================================
-- 1. Rettigheter
-- ===========================================================================
select set_config('role', 'anon', true);
select throws_ok($$select * from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  '42501', null, 'anon kan ikke kalle create_invite');
select throws_ok($$select public.accept_invite('ABCDEFGH', 'Ola', 'fox')$$,
  '42501', null, 'anon kan ikke kalle accept_invite');
select tests.logout();

-- ===========================================================================
-- 2. Hvem kan lage invitasjoner
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$select * from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'P0001', 'not_adult', 'barnet kan ikke lage invitasjon');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select * from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'P0001', 'not_adult', 'anonym bruker uten medlemskap kan ikke lage invitasjon');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok($$select * from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'P0001', 'not_adult', 'voksen i en annen husstand kan ikke lage invitasjon til A');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok($$select * from public.create_invite('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')$$,
  'P0001', 'subscription_required', 'husstand uten tilgang kan ikke lage invitasjon');
select tests.logout();

select is((select count(*)::int from public.invites), 0, 'ingen invitasjoner ble laget av de avviste kallene');

-- ===========================================================================
-- 3. Voksen i A lager koder
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$insert into tests.codes select 'first', code, expires_at
    from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'voksen kan lage invitasjon');
insert into tests.codes select 'expired', code, expires_at from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
insert into tests.codes select 'revoked', code, expires_at from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
insert into tests.codes select 'blocked', code, expires_at from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
insert into tests.codes select 'lower',   code, expires_at from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select is((select count(*)::int from public.invites), 5, 'voksen ser husstandens invitasjoner');
select throws_ok($$select code_hash from public.invites$$,
  '42501', null, 'klienten kan ikke lese hashen');
select throws_ok(
  $$insert into public.invites (household_id, code_hash, created_by, expires_at)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '\x00', 'aaaaaaaa-0000-0000-0000-0000000000a1', now())$$,
  '42501', null, 'klienten kan ikke sette inn invitasjoner direkte');
select throws_ok($$update public.invites set expires_at = now() + interval '1 year'$$,
  '42501', null, 'klienten kan ikke forlenge en invitasjon');
select tests.logout();

select ok((select bool_and(code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$') from tests.codes),
  'kodene har 8 tegn fra alfabetet uten 0/O/1/I/L');
select is((select count(distinct code)::int from tests.codes), 5, 'kodene er ulike');
select ok((select bool_and(expires_at = now() + interval '48 hours') from tests.codes),
  'kodene utløper etter 48 timer');
select results_eq(
  $$select encode(i.code_hash, 'hex') from public.invites i
    join tests.codes c on i.code_hash = sha256(convert_to(c.code, 'UTF8')) order by 1$$,
  $$select encode(code_hash, 'hex') from public.invites order by 1$$,
  'hver rad lagrer SHA-256 av koden');
select is(
  (select count(*)::int from public.invites i, tests.codes c
   where position(convert_to(c.code, 'UTF8') in i.code_hash) > 0),
  0, 'klarteksten finnes ikke i noen rad');
select results_eq(
  $$select distinct household_id, created_by from public.invites$$,
  $$values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaaaaaa-0000-0000-0000-0000000000a1'::uuid)$$,
  'invitasjonen hører til A og er laget av A1');

-- ===========================================================================
-- 4. Ingen andre ser invitasjonene
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.invites), 0, 'voksen i B ser ingen invitasjoner i A');
select is(tests.rows_affected('delete from public.invites'), 0,
  'voksen i B kan ikke slette invitasjoner i A');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.invites), 0, 'barnet ser ingen invitasjoner');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-0000000000f1');
select is((select count(*)::int from public.invites), 0, 'bruker uten husstand ser ingen invitasjoner');
select throws_ok($$select * from public.invite_attempts$$,
  '42501', null, 'invite_attempts er stengt for klienten');
select tests.logout();

-- ===========================================================================
-- 5. Riktig kode
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000f1');
select is(
  public.accept_invite((select code from tests.codes where name = 'first'), '  Nina  ', 'owl'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'riktig kode gir husstandens id');
select results_eq(
  $$select household_id, role::text, display_name, avatar from public.members
    where auth_user_id = '00000000-0000-0000-0000-0000000000f1'$$,
  $$values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'adult', 'Nina', 'owl')$$,
  'brukeren er voksen i A med trimmet navn og avatar');
select is((select count(*)::int from public.tasks
           where id = '11111111-0000-0000-0000-000000000001'), 1,
  'den nye voksne ser oppgavene i A');
select lives_ok(
  $$select * from public.complete_task('11111111-0000-0000-0000-000000000001',
      (select id from public.members where auth_user_id = '00000000-0000-0000-0000-0000000000f1'))$$,
  'den nye voksne kan krysse av en oppgave');
select isnt((select used_at from public.invites where used_by is not null), null,
  'invitasjonen er markert som brukt (synlig for den nye voksne)');
select tests.logout();

select is(
  (select used_by from public.invites where used_at is not null),
  (select id from public.members where auth_user_id = '00000000-0000-0000-0000-0000000000f1'),
  'used_by peker på det nye medlemmet');

-- Brukt invitasjon kan ikke slettes (trekkes tilbake).
select tests.login_as('00000000-0000-0000-0000-0000000000a1');
select is(tests.rows_affected('delete from public.invites where used_at is not null'), 0,
  'en brukt invitasjon kan ikke trekkes tilbake');
select tests.logout();

-- ===========================================================================
-- 6. Koden virker bare én gang
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000f2');
select is(public.accept_invite((select code from tests.codes where name = 'first'), 'Ola', 'fox'),
  null::uuid, 'brukt kode gir null (invite_invalid)');
select tests.logout();

-- ===========================================================================
-- 7. Utløpt og tilbaketrukket kode
-- ===========================================================================
update public.invites set expires_at = now() - interval '1 second'
where code_hash = sha256(convert_to((select code from tests.codes where name = 'expired'), 'UTF8'));

select tests.login_as('00000000-0000-0000-0000-0000000000f2');
select is(public.accept_invite((select code from tests.codes where name = 'expired'), 'Ola', 'fox'),
  null::uuid, 'utløpt kode gir null (invite_invalid)');
select tests.logout();

-- A1 trekker tilbake. A1 ser ikke hashen, så vi finner id-en som superbruker først.
create table tests.revoke_id as
  select id from public.invites
  where code_hash = sha256(convert_to((select code from tests.codes where name = 'revoked'), 'UTF8'));
grant select on tests.revoke_id to authenticated;

select tests.login_as('00000000-0000-0000-0000-0000000000a1');
select is(tests.rows_affected('delete from public.invites where id = (select id from tests.revoke_id)'), 1,
  'voksen i A kan trekke tilbake en ubrukt invitasjon');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-0000000000f2');
select is(public.accept_invite((select code from tests.codes where name = 'revoked'), 'Ola', 'fox'),
  null::uuid, 'tilbaketrukket kode gir null (invite_invalid)');
select is(public.accept_invite('ZZZZZZZZ', 'Ola', 'fox'),
  null::uuid, 'feil kode gir null (invite_invalid)');
select tests.logout();

select is((select count(*)::int from public.invite_attempts
           where user_id = '00000000-0000-0000-0000-0000000000f2'), 4,
  'hvert feilede forsøk er lagret');
select is((select count(*)::int from public.members
           where auth_user_id = '00000000-0000-0000-0000-0000000000f2'), 0,
  'brukeren med feil koder ble ikke medlem');

-- ===========================================================================
-- 8. Sperre etter 5 feilede forsøk
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000f3');
select is(public.accept_invite('AAAAAAA2', 'Per', 'fox'), null::uuid, 'feilet forsøk 1');
select is(public.accept_invite('AAAAAAA3', 'Per', 'fox'), null::uuid, 'feilet forsøk 2');
select is(public.accept_invite('AAAAAAA4', 'Per', 'fox'), null::uuid, 'feilet forsøk 3');
select is(public.accept_invite('AAAAAAA5', 'Per', 'fox'), null::uuid, 'feilet forsøk 4');
select is(public.accept_invite('AAAAAAA6', 'Per', 'fox'), null::uuid, 'feilet forsøk 5');
select throws_ok(
  $$select public.accept_invite((select code from tests.codes where name = 'blocked'), 'Per', 'fox')$$,
  'P0001', 'too_many_attempts', 'etter 5 feil sperres også riktig kode');
select tests.logout();

-- 16 minutter senere: sperren er over.
update public.invite_attempts set attempted_at = now() - interval '16 minutes'
where user_id = '00000000-0000-0000-0000-0000000000f3';

select tests.login_as('00000000-0000-0000-0000-0000000000f3');
select is(public.accept_invite((select code from tests.codes where name = 'blocked'), 'Per', 'fox'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'etter 15 minutter virker koden igjen');
select tests.logout();

-- ===========================================================================
-- 9. Normalisering: små bokstaver, mellomrom og bindestrek
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000f4');
select is(
  public.accept_invite(
    (select ' ' || lower(left(code, 4)) || ' - ' || lower(right(code, 4)) || ' ' from tests.codes where name = 'lower'),
    'Kari', 'cat'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'kode med små bokstaver, mellomrom og bindestrek virker');
select tests.logout();

-- ===========================================================================
-- 10. Hvem kan ikke løse inn
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-0000000000a1');
insert into tests.codes select 'spare', code, expires_at from public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select tests.logout();

select tests.login_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok(
  $$select public.accept_invite((select code from tests.codes where name = 'spare'), 'B1', 'owl')$$,
  'P0001', 'already_in_household', 'bruker med husstand avvises');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-0000000000d1');
select throws_ok(
  $$select public.accept_invite((select code from tests.codes where name = 'spare'), 'Anon', 'fox')$$,
  'P0001', 'anonymous_not_allowed', 'anonym bruker kan ikke bli med som voksen');
select tests.logout();

select is((select used_at from public.invites
           where code_hash = sha256(convert_to((select code from tests.codes where name = 'spare'), 'UTF8'))),
  null::timestamptz, 'de avviste kallene brukte ikke opp koden');

select * from finish();
rollback;
