-- Tester for complete_task, undo_completion, task_completions og feedback_messages.
-- Se docs/DATABASE.md §3–5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(54);

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

-- Resultatene fra complete_task, med et navn så senere tester kan slå dem opp.
create table tests.res (
  name text, completion_id uuid, feedback_text text, next_due_on date
);
grant all on tests.res to authenticated;

-- Kaller complete_task og lagrer resultatet under et navn.
create function tests.complete(p_name text, p_task uuid, p_member uuid)
returns void language plpgsql as $$
begin
  insert into tests.res
  select p_name, r.completion_id, r.feedback_text, r.next_due_on
  from public.complete_task(p_task, p_member) r;
end;
$$;
grant execute on function tests.complete(text, uuid, uuid) to authenticated;

create function tests.cid(p_name text)
returns uuid language sql as $$ select completion_id from tests.res where name = p_name $$;
grant execute on function tests.cid(text) to authenticated;

create table tests.d as select private.local_today('Europe/Oslo') as today;
grant select on tests.d to authenticated;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A med enhet, søsken A uten enhet. Tone: fact. Europe/Oslo.
--   B: voksen B, barn B.
--   C: utløpt prøvetid.
--   D: voksen D, tone both (egen husstand, så tidligere avkrysninger ikke påvirker utvalget).
--   K og P: ytterpunktene for tidssoner, +14 (Kiritimati) og −11 (Pago Pago).
--   F: innlogget uten medlemskap.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com'),
  ('00000000-0000-0000-0000-00000000a002', null),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com'),
  ('00000000-0000-0000-0000-00000000c001', 'voksen-c@example.com'),
  ('00000000-0000-0000-0000-00000000d001', 'voksen-d@example.com'),
  ('00000000-0000-0000-0000-00000000e001', 'voksen-k@example.com'),
  ('00000000-0000-0000-0000-00000000e002', 'voksen-p@example.com'),
  ('00000000-0000-0000-0000-00000000f001', 'fremmed@example.com');

insert into public.households (id, name, type, housing_type, feedback_tone, timezone, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     'fact', 'Europe/Oslo',       now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', 'both', 'Europe/Oslo',       now() + interval '14 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'C', 'single', 'apartment', 'both', 'Europe/Oslo',       now() - interval '1 day'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'D', 'single', 'apartment', 'both', 'Europe/Oslo',       now() + interval '14 days'),
  ('eeeeeeee-eeee-eeee-eeee-000000000001', 'K', 'single', 'apartment', 'both', 'Pacific/Kiritimati', now() + interval '14 days'),
  ('eeeeeeee-eeee-eeee-eeee-000000000002', 'P', 'single', 'apartment', 'both', 'Pacific/Pago_Pago',  now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A',   'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Søsken A', 'bear', 2019, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'frog', 2015, null),
  ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C', 'cat',  null, '00000000-0000-0000-0000-00000000c001'),
  ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'adult', 'Voksen D', 'cat',  null, '00000000-0000-0000-0000-00000000d001'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-000000000001', 'adult', 'Voksen K', 'cat',  null, '00000000-0000-0000-0000-00000000e001'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-000000000002', 'adult', 'Voksen P', 'cat',  null, '00000000-0000-0000-0000-00000000e002');

-- Oppgaver (som superbruker; triggeren setter første frist = i dag for alle disse).
insert into public.tasks (id, household_id, title, recurrence_type, recurrence_unit, recurrence_every, weekdays) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Intervall', 'interval', 'day',  14, null),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kalender',  'calendar', 'week', 1,
     array[extract(isodow from private.local_today('Europe/Oslo'))::smallint]),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Én gang',   'once',     null,   null, null),
  ('11111111-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Arkivert',  'once',     null,   null, null),
  ('11111111-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Barnets',   'interval', 'day',  1,  null),
  ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B sin',     'once',     null,   null, null),
  ('33333333-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'C sin',     'once',     null,   null, null),
  ('44444444-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'D sin',     'interval', 'day',  1,  null),
  ('55555555-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-000000000001', 'K sin',     'once',     null,   null, null),
  ('55555555-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-000000000002', 'P sin',     'once',     null,   null, null);
update public.tasks set archived_at = now() where id = '11111111-0000-0000-0000-000000000004';

-- ===========================================================================
-- 1. Voksen A krysser av en intervalloppgave for seg selv
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select lives_ok(
  $$select tests.complete('int1', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'voksen A kan krysse av for seg selv');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  (select today + 14 from tests.d), 'intervall: ny frist er 14 dager etter i dag');
select is((select next_due_on from tests.res where name = 'int1'),
  (select today + 14 from tests.d), 'complete_task returnerer den nye fristen');
select ok((select feedback_text from tests.res where name = 'int1') is not null,
  'complete_task returnerer en tilbakemelding');

select is((select completed_on from public.task_completions where id = tests.cid('int1')),
  (select today from tests.d), 'completed_on er i dag i husstandens tidssone');
select is((select due_on from public.task_completions where id = tests.cid('int1')),
  (select today from tests.d), 'due_on er fristen som ble dekket');
select is((select recorded_by from public.task_completions where id = tests.cid('int1')),
  '00000000-0000-0000-0000-00000000a001'::uuid, 'recorded_by er den innloggede');
select is((select completed_by_member_id from public.task_completions where id = tests.cid('int1')),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'completed_by er medlemmet som gjorde det');

-- Tone fact: teksten skal være fakta, og passe for voksne eller alle.
select is((select m.tone from public.task_completions c
           join public.feedback_messages m on m.id = c.feedback_message_id
           where c.id = tests.cid('int1')), 'fact', 'tone fact gir en faktatekst');
select is((select m.text from public.task_completions c
           join public.feedback_messages m on m.id = c.feedback_message_id
           where c.id = tests.cid('int1')),
  (select feedback_text from tests.res where name = 'int1'),
  'feedback_message_id lagres, og peker på teksten som ble returnert');

-- ===========================================================================
-- 2. Fast kalender, på vegne av et barn uten enhet, og angring
-- ===========================================================================
select lives_ok(
  $$select tests.complete('cal1', '11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'voksen A kan krysse av på vegne av et barn');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000002'),
  (select today + 7 from tests.d), 'kalender: ny frist er samme ukedag neste uke');
select is((select completed_by_member_id from public.task_completions where id = tests.cid('cal1')),
  'aaaaaaaa-0000-0000-0000-000000000003'::uuid, 'barnet står som den som gjorde det');
select isnt((select m.audience::text from public.task_completions c
             join public.feedback_messages m on m.id = c.feedback_message_id
             where c.id = tests.cid('cal1')), 'adult', 'barnet får ikke en tekst for voksne');

select lives_ok($$select public.undo_completion(tests.cid('cal1'))$$, 'voksen A kan angre');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000002'),
  (select today from tests.d), 'angring setter fristen tilbake');
select tests.logout();
select is((select count(*)::int from public.task_completions where id = tests.cid('cal1')), 0,
  'angring sletter raden');
select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- ===========================================================================
-- 3. Engangsoppgave: ferdig etter avkrysning, tilbake etter angring
-- ===========================================================================
select tests.complete('once1', '11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000003'),
  null, 'engangsoppgave har ingen frist etter avkrysning');
select public.undo_completion(tests.cid('once1'));
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000003'),
  (select today from tests.d), 'angret engangsoppgave får fristen tilbake');

-- ===========================================================================
-- 4. Bare siste avkrysning kan angres, og bare innen 10 minutter
-- ===========================================================================
select tests.complete('int2', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
select throws_ok($$select public.undo_completion(tests.cid('int1'))$$,
  'P0001', 'undo_not_allowed', 'en eldre avkrysning kan ikke angres');
select lives_ok($$select public.undo_completion(tests.cid('int2'))$$,
  'den siste avkrysningen kan angres');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  (select today + 14 from tests.d), 'fristen går tilbake til det den var før siste avkrysning');

select tests.logout();
update public.task_completions set completed_at = now() - interval '11 minutes'
  where id = tests.cid('int1');
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.undo_completion(tests.cid('int1'))$$,
  'P0001', 'undo_expired', 'etter 10 minutter kan avkrysningen ikke angres');

-- ===========================================================================
-- 5. Tone humor
-- ===========================================================================
select tests.logout();
update public.households set feedback_tone = 'humor' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select tests.complete('hum1', '11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001');
select is((select m.tone from public.task_completions c
           join public.feedback_messages m on m.id = c.feedback_message_id
           where c.id = tests.cid('hum1')), 'humor', 'tone humor gir en humortekst');

-- ===========================================================================
-- 6. Det voksne ikke kan
-- ===========================================================================
select throws_ok(
  $$select public.complete_task('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')$$,
  'P0001', 'invalid_member', 'kan ikke krysse av på vegne av et medlem i en annen husstand');
select throws_ok(
  $$select public.complete_task('11111111-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'P0001', 'task_not_found', 'kan ikke krysse av en arkivert oppgave');
select throws_ok(
  $$insert into public.task_completions (household_id, task_id, completed_by_member_id, completed_on)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-0000-0000-0000-000000000001',
            'aaaaaaaa-0000-0000-0000-000000000001', '2020-01-01')$$,
  '42501', null, 'kan ikke sette inn i task_completions direkte');
select throws_ok(
  $$update public.task_completions set completed_on = '2020-01-01' where id = tests.cid('int1')$$,
  '42501', null, 'kan ikke endre task_completions direkte');
select throws_ok(
  $$delete from public.task_completions where id = tests.cid('int1')$$,
  '42501', null, 'kan ikke slette fra task_completions direkte');

-- ===========================================================================
-- 7. Barn med egen enhet
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$select public.complete_task('11111111-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'P0001', 'invalid_member', 'barn kan ikke krysse av for søsken');
select throws_ok(
  $$select public.complete_task('11111111-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'P0001', 'invalid_member', 'barn kan ikke krysse av for en voksen');
select throws_ok($$select public.undo_completion(tests.cid('hum1'))$$,
  'P0001', 'undo_not_allowed', 'barn kan ikke angre en voksens avkrysning');

-- Barnet krysser av 15 ganger for seg selv. Ingen av tekstene skal være for voksne.
select lives_ok(
  $$select tests.complete('child' || i, '11111111-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002')
    from generate_series(1, 15) i$$,
  'barn kan krysse av for seg selv');
select is((select count(*)::int from tests.res r
           join public.task_completions c on c.id = r.completion_id
           join public.feedback_messages m on m.id = c.feedback_message_id
           where r.name like 'child%' and m.audience = 'adult'), 0,
  'barn får aldri tekster for voksne');
select lives_ok($$select public.undo_completion(tests.cid('child15'))$$,
  'barn kan angre sin egen siste avkrysning');

-- ===========================================================================
-- 8. Andre husstander og brukere uten medlemskap
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*)::int from public.task_completions), 0,
  'voksen B ser ingen avkrysninger fra A');
select throws_ok(
  $$select public.complete_task('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001')$$,
  'P0001', 'task_not_found', 'voksen B kan ikke krysse av oppgaver i A (for seg selv)');
select throws_ok(
  $$select public.complete_task('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'P0001', 'task_not_found', 'voksen B kan ikke krysse av oppgaver i A (for et medlem i A)');
select throws_ok($$select public.undo_completion(tests.cid('hum1'))$$,
  'P0001', 'completion_not_found', 'voksen B kan ikke angre avkrysninger i A');
select is((select next_due_on from public.tasks where id = '11111111-0000-0000-0000-000000000001'),
  null, 'voksen B ser ikke engang fristen til oppgaven i A');

select tests.login_as('00000000-0000-0000-0000-00000000f001');
select throws_ok(
  $$select public.complete_task('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'P0001', 'task_not_found', 'bruker uten medlemskap kan ikke krysse av');
select is((select count(*)::int from public.task_completions), 0,
  'bruker uten medlemskap ser ingen avkrysninger');

select tests.login_as('00000000-0000-0000-0000-00000000c001');
select throws_ok(
  $$select public.complete_task('33333333-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001')$$,
  'P0001', 'subscription_required', 'utløpt prøvetid: kan ikke krysse av');

-- ===========================================================================
-- 9. Tone both: begge tonene brukes, og de siste 20 gjentas ikke
-- En voksen med en oppgave i kategorien other kan få 7 faktatekster og 11 humortekster
-- (aktive, for alle eller voksne, uten kategori). 12 avkrysninger uten gjentakelse er flere enn
-- begge tallene, så begge tonene må komme med. Testen under sjekker forutsetningen, så den
-- feiler tydelig hvis tekstene endres slik at garantien ikke lenger holder.
-- ===========================================================================
select tests.logout();
create view tests.adult_other_texts as
select tone from public.feedback_messages
where is_active and audience in ('any', 'adult') and category is null;
select ok(
  (select count(*) filter (where tone = 'fact')  < 12
      and count(*) filter (where tone = 'humor') < 12
      and count(*) >= 12
   from tests.adult_other_texts),
  'forutsetning: under 12 tekster per tone, og minst 12 totalt, for voksne');

select tests.login_as('00000000-0000-0000-0000-00000000d001');
select tests.complete('both' || i, '44444444-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001')
from generate_series(1, 12) i;
select tests.logout();
select is((select count(distinct m.tone)::int from tests.res r
           join public.task_completions c on c.id = r.completion_id
           join public.feedback_messages m on m.id = c.feedback_message_id
           where r.name like 'both%'), 2, 'tone both gir både fakta og humor');
select is((select count(distinct c.feedback_message_id)::int from tests.res r
           join public.task_completions c on c.id = r.completion_id
           where r.name like 'both%'), 12, 'ingen tekst gjentas blant de siste 20');
select is((select count(*)::int from tests.res r
           join public.task_completions c on c.id = r.completion_id
           join public.feedback_messages m on m.id = c.feedback_message_id
           where not m.is_active), 0, 'deaktiverte tekster velges aldri');

-- ===========================================================================
-- 10. Tidssone: completed_on er datoen i husstandens tidssone, ikke i UTC.
-- Kiritimati (+14) og Pago Pago (−11) er 25 timer fra hverandre, så datoene er alltid ulike.
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000e001');
select tests.complete('tzK', '55555555-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001');
select tests.login_as('00000000-0000-0000-0000-00000000e002');
select tests.complete('tzP', '55555555-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000002');
select tests.logout();

select is((select completed_on from public.task_completions where id = tests.cid('tzK')),
  private.local_today('Pacific/Kiritimati'), 'Kiritimati: completed_on er lokal dato der');
select is((select completed_on from public.task_completions where id = tests.cid('tzP')),
  private.local_today('Pacific/Pago_Pago'), 'Pago Pago: completed_on er lokal dato der');
select isnt((select completed_on from public.task_completions where id = tests.cid('tzK')),
  (select completed_on from public.task_completions where id = tests.cid('tzP')),
  'samme øyeblikk gir ulik dato i de to husstandene');

-- ===========================================================================
-- 11. feedback_messages kan leses av innloggede, ikke av anon
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000f001');
select ok((select count(*) from public.feedback_messages) > 0, 'innloggede kan lese tilbakemeldingstekster');
select is((select count(*)::int from public.feedback_messages
           where text = 'Gratulerer, du var voksen i dag også.'), 0,
  'innloggede ser ikke deaktiverte tekster');
select throws_ok($$insert into public.feedback_messages (tone, text) values ('humor', 'Hack')$$,
  '42501', null, 'innloggede kan ikke legge til tekster');
select tests.logout();
set local role anon;
select throws_ok($$select count(*) from public.feedback_messages$$,
  '42501', null, 'anon kan ikke lese tilbakemeldingstekster');
reset role;

select * from finish();
rollback;
