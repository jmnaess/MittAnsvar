-- Tester for tekstgruppene i complete_task (feedback_messages.kind og p_last_today).
-- Se docs/DATABASE.md §4–5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

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

-- Resultatene fra complete_task i rekkefølge, med et navn så testene kan slå dem opp.
create table tests.res (
  n serial, name text, feedback_text text, feedback_kind text
);
grant all on tests.res to authenticated;
grant usage on sequence tests.res_n_seq to authenticated;

create function tests.complete(p_name text, p_task uuid, p_member uuid, p_last boolean)
returns void language plpgsql as $$
begin
  insert into tests.res (name, feedback_text, feedback_kind)
  select p_name, r.feedback_text, r.feedback_kind
  from public.complete_task(p_task, p_member, p_last) r;
end;
$$;

-- Gruppen, målgruppen og tonen til en tekst (lest som postgres, også deaktiverte).
create function tests.kind_of(p_name text)
returns text language sql security definer as $$
  select m.kind from public.feedback_messages m
  join tests.res r on r.feedback_text = m.text where r.name = p_name
$$;
create function tests.audience_of(p_name text)
returns text language sql security definer as $$
  select m.audience::text from public.feedback_messages m
  join tests.res r on r.feedback_text = m.text where r.name = p_name
$$;
create function tests.tone_of(p_name text)
returns text language sql security definer as $$
  select m.tone from public.feedback_messages m
  join tests.res r on r.feedback_text = m.text where r.name = p_name
$$;

-- Antall ganger samme tekst kom to ganger på rad i en serie.
create function tests.repeats(p_name text)
returns int language sql as $$
  select count(*)::int from (
    select feedback_text, lag(feedback_text) over (order by n) as prev
    from tests.res where name = p_name
  ) s where feedback_text = prev
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Testdata: husstand med tone fact. Voksen og barn på 2, 4 og 6 år, og et barn uten fødselsår.
-- Alderen regnes som år i dag minus fødselsår, i husstandens tidssone.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com');

insert into public.households (id, name, type, housing_type, feedback_tone, timezone, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house', 'fact', 'Europe/Oslo', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id)
select v.id::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v.role::public.member_role, v.name, 'fox',
       case when v.age is null then null else extract(year from private.local_today('Europe/Oslo'))::int - v.age end,
       v.auth::uuid
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'adult', 'Voksen',  null::int, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'child', 'Toåring',  2,  null),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'child', 'Fireåring', 4, null),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'child', 'Seksåring', 6, null),
  ('aaaaaaaa-0000-0000-0000-000000000009', 'child', 'Uten år',  null, null)
) as v(id, role, name, age, auth);

-- En daglig oppgave uten ansvarlig: voksen kan krysse av for alle, så mange ganger som trengs.
insert into public.tasks (id, household_id, title, recurrence_type, recurrence_unit, recurrence_every) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Daglig', 'interval', 'day', 1);

select tests.login_as('00000000-0000-0000-0000-00000000a001');

-- ===========================================================================
-- 1. Alder: 5 år eller yngre gir young, ellers regular
-- ===========================================================================
select tests.complete('fire', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', false);
select tests.complete('to',   '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', false);
select tests.complete('seks', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000006', false);
select tests.complete('uten', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000009', false);

select is((select feedback_kind from tests.res where name = 'fire'), 'young', '4-åring: feedback_kind er young');
select is(tests.kind_of('fire'), 'young', '4-åring får en young-tekst, også i en fakta-husstand');
select is(tests.kind_of('to'), 'young', '2-åring får en young-tekst');
select is((select feedback_kind from tests.res where name = 'seks'), 'regular', '6-åring: feedback_kind er regular');
select is(tests.tone_of('seks'), 'fact', '6-åring får en vanlig tekst i husstandens tone');
select is(tests.kind_of('uten'), 'regular', 'barn uten fødselsår får en vanlig tekst');

-- ===========================================================================
-- 2. Siste for dagen går foran alder, og gjelder bare barn
-- ===========================================================================
select tests.complete('siste6', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000006', true);
select tests.complete('siste4', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', true);
select tests.complete('voksen', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', true);

select is((select feedback_kind from tests.res where name = 'siste6'), 'day_done', '6-åring, siste for dagen: day_done');
select is(tests.kind_of('siste6'), 'day_done', 'siste for dagen gir en day_done-tekst, også i en fakta-husstand');
select is(tests.kind_of('siste4'), 'day_done', '4-åring, siste for dagen: day_done går foran young');
select is((select feedback_kind from tests.res where name = 'voksen'), 'regular', 'voksen med p_last_today: regular');
select is(tests.kind_of('voksen'), 'regular', 'voksen får aldri day_done- eller young-tekst');
select isnt(tests.audience_of('voksen'), 'child', 'voksen får ikke en barnetekst');

-- ===========================================================================
-- 3. Ikke samme tekst to ganger på rad i samme gruppe
-- ===========================================================================
do $$
begin
  for i in 1..8 loop
    perform tests.complete('rad_siste', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000006', true);
    perform tests.complete('rad_ung',   '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', false);
  end loop;
end;
$$;

select is(tests.repeats('rad_siste'), 0, 'day_done: aldri samme tekst to ganger på rad');
select is(tests.repeats('rad_ung'), 0, 'young: aldri samme tekst to ganger på rad');

-- ===========================================================================
-- 4. Ingen aktiv tekst i gruppen: en vanlig tekst brukes
-- ===========================================================================
reset role;
update public.feedback_messages set is_active = false where kind = 'young';
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select tests.complete('reserve', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', false);
select is(tests.kind_of('reserve'), 'regular', 'uten aktive young-tekster: en vanlig tekst');
select is((select feedback_kind from tests.res where name = 'reserve'), 'young', 'feedback_kind er fortsatt young (feiringen)');

reset role;

select * from finish();
rollback;
