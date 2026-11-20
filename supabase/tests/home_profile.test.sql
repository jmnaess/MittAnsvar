-- Tester for hjemprofilen (kolonner på households) og task_templates.requires.
-- Se migrasjonen *_home_profile.sql og docs/DATABASE.md §1, §4 og §5. Alt rulles tilbake.
--
-- Dubletter ved ny aktivering av maler er dekket i templates.test.sql (activate_templates).
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

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

create function tests.affected(stmt text)
returns int language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- Minste gyldige mal med en gitt requires. Brukes til å teste check-constrainten.
create function tests.insert_template(p_slug text, p_requires jsonb)
returns void language sql as $$
  insert into public.task_templates
    (slug, title, description, category, recurrence_type, recurrence_unit, recurrence_every, month, requires)
  values (p_slug, 'Test', 'Test', 'maintenance', 'calendar', 'year', 1, 5, p_requires);
$$;

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A med enhet (a002).
--   B: voksen B.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'couple', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox', null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A',   'owl', 2016, '00000000-0000-0000-0000-00000000a002'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat', null, '00000000-0000-0000-0000-00000000b001');

-- ===========================================================================
-- 1. Ny husstand: alle spørsmål er ubesvart (null)
-- ===========================================================================
select is(
  (select row(has_garden, has_car, has_cabin, has_air_heat_pump, has_fireplace,
              has_balanced_ventilation, has_hydronic_heating, has_private_well, sewage_type)::text
   from public.households where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '(,,,,,,,,)',
  'ny husstand: alle profilspørsmål er null (ikke svart)');

-- ===========================================================================
-- 2. Voksen endrer profilen i egen husstand
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');

select is(tests.affected($$update public.households
  set has_garden = true, has_car = true, has_cabin = false, has_air_heat_pump = true,
      has_fireplace = false, has_balanced_ventilation = true, has_hydronic_heating = false,
      has_private_well = false, sewage_type = 'septic_tank'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$), 1,
  'voksen kan svare på alle spørsmålene i egen husstand');

select is(
  (select row(has_garden, has_car, has_cabin, has_air_heat_pump, has_fireplace,
              has_balanced_ventilation, has_hydronic_heating, has_private_well, sewage_type)::text
   from public.households where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '(t,t,f,t,f,t,f,f,septic_tank)',
  'svarene er lagret');

select is(tests.affected($$update public.households set has_car = null
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$), 1,
  'voksen kan sette et svar tilbake til ubesvart');

select throws_ok(
  $$update public.households set sewage_type = 'pipe' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '22P02', null,
  'ugyldig avløpstype avvises');

-- Andre kolonner er fortsatt låst (uendret fra households-migrasjonen).
select throws_ok(
  $$update public.households set trial_ends_at = now() + interval '1 year'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'voksen kan fortsatt ikke endre trial_ends_at');

-- ===========================================================================
-- 3. Voksen i en annen husstand: verken lese eller endre
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000b001');

select is(
  (select count(*)::int from public.households where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0,
  'voksen B ser ikke profilen til husstand A');

select is(tests.affected($$update public.households set has_garden = false
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$), 0,
  'voksen B kan ikke endre profilen til husstand A');

select is(tests.affected($$update public.households set has_garden = true
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$), 1,
  'voksen B kan endre profilen i egen husstand');

-- ===========================================================================
-- 4. Barn med enhet: kan lese, ikke endre
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');

select is(
  (select has_garden from public.households where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), true,
  'barn kan lese profilen i egen husstand');

select is(tests.affected($$update public.households set has_garden = false
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$), 0,
  'barn kan ikke endre profilen');

select is(tests.affected($$update public.households set sewage_type = 'municipal'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$), 0,
  'barn kan ikke endre avløpstype');

select tests.logout();

select is(
  (select has_garden from public.households where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), true,
  'barnets forsøk endret ingenting');

-- ===========================================================================
-- 5. task_templates.requires
-- ===========================================================================
-- Innholdet fra *_home_profile_templates.sql
select is(
  (select requires from public.task_templates where slug = 'winter-tyres'), '{"has_car": true}'::jsonb,
  'innhold: dekkskift krever bil');

select is(
  (select row(housing_types, requires)::text from public.task_templates where slug = 'chimney-check'),
  '(,"{""has_fireplace"": true}")',
  'innhold: pipesjekk krever peis, ikke lenger «hus»');

select is(
  (select count(*)::int from public.task_templates
   where slug in ('ventilation-filter-spring', 'ventilation-filter-autumn') and is_active), 0,
  'innhold: vår- og høstfilteret er deaktivert');

select is(
  (select row(recurrence_type, recurrence_unit, recurrence_every, month)::text
   from public.task_templates where slug = 'heat-pump-filter'),
  '(interval,week,8,)',
  'innhold: varmepumpefilteret er en intervallmal, hver 8. uke');

select is(
  (select row(recurrence_type, recurrence_unit, recurrence_every)::text
   from public.task_templates where slug = 'ventilation-filter'),
  '(interval,month,6)',
  'innhold: ventilasjonsfilteret er en intervallmal, hver 6. måned');

select is(
  (select array_agg(month order by month) from public.task_templates
   where title = 'Sjekk utedelen på varmepumpen'),
  '{1,11}'::smallint[],
  'innhold: utedelen på varmepumpen i januar og november');

select is(
  (select count(*)::int from public.task_templates
   where slug in ('heat-pump-service', 'fireplace-glass-gasket', 'well-filter', 'sewage-minirens', 'cabin-gutters-roof')),
  0,
  'innhold: strøkne maler finnes ikke');

select is(
  (select count(*)::int from public.task_templates where requires is not null and is_active), 26,
  'innhold: 26 aktive maler har betingelse (4 eksisterende, 18 nye årsmaler, 2 intervallmaler, 2 sesongmaler)');

select lives_ok($$select tests.insert_template('t-null', null)$$,
  'requires null = ingen betingelse');
select lives_ok($$select tests.insert_template('t-bool', '{"has_air_heat_pump": true}')$$,
  'requires med ja/nei-spørsmål');
select lives_ok($$select tests.insert_template('t-false', '{"has_car": false}')$$,
  'requires kan kreve «nei»');
select lives_ok($$select tests.insert_template('t-multi', '{"has_garden": true, "has_cabin": true}')$$,
  'requires med flere spørsmål');
select lives_ok($$select tests.insert_template('t-sewage', '{"sewage_type": ["septic_tank", "mini_treatment_plant"]}')$$,
  'requires med liste av avløpstyper');

select throws_ok($$select tests.insert_template('t-empty', '{}')$$,
  '23514', null, 'tomt objekt avvises (bruk null)');
select throws_ok($$select tests.insert_template('t-unknown', '{"has_pool": true}')$$,
  '23514', null, 'ukjent spørsmål avvises');
select throws_ok($$select tests.insert_template('t-type', '{"has_garden": "yes"}')$$,
  '23514', null, 'ja/nei-spørsmål må ha true/false');
select throws_ok($$select tests.insert_template('t-sewage-scalar', '{"sewage_type": "septic_tank"}')$$,
  '23514', null, 'avløpstype må være en liste');
select throws_ok($$select tests.insert_template('t-sewage-empty', '{"sewage_type": []}')$$,
  '23514', null, 'tom liste med avløpstyper avvises');
select throws_ok($$select tests.insert_template('t-sewage-bad', '{"sewage_type": ["septic_tank", "pipe"]}')$$,
  '23514', null, 'ukjent avløpstype i listen avvises');

select * from finish();
rollback;
