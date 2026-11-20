-- Tester for at voksne bare kan endre sin egen figur og sitt eget profilbilde, også i Storage.
-- Barnas profiler kan alle voksne endre. Se *_own_adult_profile.sql.
-- Alt kjøres i én transaksjon som rulles tilbake, så ingen testdata blir liggende.
begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

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

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Storage-API-et sletter på denne måten; uten innstillingen stopper storage.protect_delete
-- alle DELETE med SQL. RLS gjelder fortsatt.
set local storage.allow_delete_query = 'true';

-- ---------------------------------------------------------------------------
-- Testdata (som superbruker)
--   Husstand F: voksen F1, voksen F2, barn F med enhet, søsken F uten enhet
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000f001', 'voksen-f1@example.com', false),
  ('00000000-0000-0000-0000-00000000f002', 'voksen-f2@example.com', false),
  ('00000000-0000-0000-0000-00000000f003', null, true);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Familien F', 'family', 'house', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'adult', 'Voksen F1', 'fox',  null, '00000000-0000-0000-0000-00000000f001'),
  ('ffffffff-0000-0000-0000-000000000002', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'adult', 'Voksen F2', 'cat',  null, '00000000-0000-0000-0000-00000000f002'),
  ('ffffffff-0000-0000-0000-000000000003', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'child', 'Barn F',    'owl',  2016, '00000000-0000-0000-0000-00000000f003'),
  ('ffffffff-0000-0000-0000-000000000004', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'child', 'Søsken F',  'frog', 2019, null);

-- F2 har et bilde fra før (lagt inn som superbruker).
insert into storage.objects (bucket_id, name) values
  ('member-photos', 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000002/22222222-2222-2222-2222-222222222222.jpg');
update public.members
  set photo_path = 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000002/22222222-2222-2222-2222-222222222222.jpg',
      avatar_mode = 'photo'
where id = 'ffffffff-0000-0000-0000-000000000002';

-- ===========================================================================
-- 1. Storage: opplasting (insert) som voksen F1
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000f001');

select lives_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.jpg')
$$, 'voksen kan laste opp bilde i sin egen mappe');

select lives_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000003/33333333-3333-3333-3333-333333333333.jpg')
$$, 'voksen kan laste opp bilde av barnet med enhet');

select lives_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000004/44444444-4444-4444-4444-444444444444.jpg')
$$, 'voksen kan laste opp bilde av barnet uten enhet');

select throws_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000002/55555555-5555-5555-5555-555555555555.jpg')
$$, '42501', null, 'voksen kan ikke laste opp bilde i en annen voksens mappe');

-- ===========================================================================
-- 2. Storage: erstatte (update) og slette (delete) som voksen F1
-- ===========================================================================
select is(tests.affected($$
  update storage.objects set name = name where bucket_id = 'member-photos'
    and name like 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000002/%'
$$), 0, 'voksen kan ikke erstatte bildet til en annen voksen');

select is(tests.affected($$
  delete from storage.objects where bucket_id = 'member-photos'
    and name like 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000002/%'
$$), 0, 'voksen kan ikke slette bildet til en annen voksen');

select is((select count(*)::int from storage.objects where bucket_id = 'member-photos'
    and name like 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000002/%'),
  1, 'voksen kan fortsatt lese bildet til en annen voksen');

select is(tests.affected($$
  delete from storage.objects where bucket_id = 'member-photos'
    and name like 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000004/%'
$$), 1, 'voksen kan slette bilde av et barn');

select is(tests.affected($$
  delete from storage.objects where bucket_id = 'member-photos'
    and name like 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000001/%'
$$), 1, 'voksen kan slette sitt eget bilde');

-- Barnet kan fortsatt ikke skrive, heller ikke i sin egen mappe.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000f003');
select throws_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000003/66666666-6666-6666-6666-666666666666.jpg')
$$, '42501', null, 'barn kan fortsatt ikke laste opp bilde av seg selv');

-- ===========================================================================
-- 3. Kolonnene på members som voksen F1
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000f001');

select is(tests.affected($$update public.members set avatar = 'bear'
                           where id = 'ffffffff-0000-0000-0000-000000000001'$$), 1,
  'voksen kan endre sin egen figur');

select tests.logout();
insert into storage.objects (bucket_id, name) values
  ('member-photos', 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000001/77777777-7777-7777-7777-777777777777.jpg');
select tests.login_as('00000000-0000-0000-0000-00000000f001');

select is(tests.affected($$update public.members
    set photo_path = 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000001/77777777-7777-7777-7777-777777777777.jpg',
        avatar_mode = 'photo'
  where id = 'ffffffff-0000-0000-0000-000000000001'$$), 1,
  'voksen kan sette sitt eget bilde og velge bilde');

select is(tests.affected($$update public.members set avatar_mode = 'figure'
                           where id = 'ffffffff-0000-0000-0000-000000000001'$$), 1,
  'voksen kan bytte til figur på seg selv');

select lives_ok($$select public.set_my_avatar_mode('photo')$$,
  'voksen kan velge bilde på seg selv med set_my_avatar_mode');

select throws_ok($$update public.members set avatar = 'lion'
                   where id = 'ffffffff-0000-0000-0000-000000000002'$$,
  'P0001', 'not_own_profile', 'voksen kan ikke endre figuren til en annen voksen');

select throws_ok($$update public.members set avatar_mode = 'figure'
                   where id = 'ffffffff-0000-0000-0000-000000000002'$$,
  'P0001', 'not_own_profile', 'voksen kan ikke bytte mellom figur og bilde for en annen voksen');

select throws_ok($$update public.members set photo_path = null, avatar_mode = 'figure'
                   where id = 'ffffffff-0000-0000-0000-000000000002'$$,
  'P0001', 'not_own_profile', 'voksen kan ikke fjerne bildet til en annen voksen');

select throws_ok($$update public.members set display_name = 'Hacket'
                   where id = 'ffffffff-0000-0000-0000-000000000002'$$,
  'P0001', 'not_own_name', 'voksen kan fortsatt ikke endre navnet til en annen voksen');

select is(tests.affected($$update public.members set avatar = avatar, avatar_mode = avatar_mode,
                             photo_path = photo_path, display_name = display_name
                           where id = 'ffffffff-0000-0000-0000-000000000002'$$), 1,
  'uendrede verdier på en annen voksen stoppes ikke');

select is(tests.affected($$update public.members set avatar = 'bear'
                           where id = 'ffffffff-0000-0000-0000-000000000003'$$), 1,
  'voksen kan endre figuren til barnet med enhet');

select is(tests.affected($$update public.members
    set photo_path = 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000003/33333333-3333-3333-3333-333333333333.jpg',
        avatar_mode = 'photo'
  where id = 'ffffffff-0000-0000-0000-000000000003'$$), 1,
  'voksen kan sette bildet til barnet med enhet');

select is(tests.affected($$update public.members set avatar = 'lion'
                           where id = 'ffffffff-0000-0000-0000-000000000004'$$), 1,
  'voksen kan endre figuren til barnet uten enhet');

-- ===========================================================================
-- 4. Barnet velger selv
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000f003');
select lives_ok($$select public.set_my_avatar('owl')$$, 'barn kan velge sin egen figur');
select lives_ok($$select public.set_my_avatar_mode('figure')$$, 'barn kan velge figur');
select lives_ok($$select public.set_my_avatar_mode('photo')$$, 'barn kan velge bilde');

select tests.logout();
select is(
  (select avatar || '/' || avatar_mode::text from public.members where id = 'ffffffff-0000-0000-0000-000000000003'),
  'owl/photo', 'barnets eget valg er lagret');

-- ===========================================================================
-- 5. Uten innlogging (superbruker) og den andre voksnes verdier
-- ===========================================================================
select is(
  (select avatar || '/' || avatar_mode::text || '/' || coalesce(photo_path, '-') || '/' || display_name
   from public.members where id = 'ffffffff-0000-0000-0000-000000000002'),
  'cat/photo/ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000002/22222222-2222-2222-2222-222222222222.jpg/Voksen F2',
  'figuren, bildet og navnet til voksen F2 er uendret');

select is(
  (select avatar || '/' || avatar_mode::text from public.members where id = 'ffffffff-0000-0000-0000-000000000001'),
  'bear/photo', 'voksen F1 sine egne endringer er lagret');

select is(tests.affected($$update public.members set avatar = 'lion'
                           where id = 'ffffffff-0000-0000-0000-000000000002'$$), 1,
  'uten innlogget bruker gjelder ikke regelen');

-- ===========================================================================
-- 6. Sletting av konto: service-rollen (Edge delete-account) sletter alle bilder
-- ===========================================================================
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
select set_config('role', 'service_role', true);

select is(tests.affected($$
  delete from storage.objects where bucket_id = 'member-photos'
    and name like 'ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000002/%'
$$), 1, 'service-rollen kan slette bildet til voksen F2');

select is(tests.affected($$
  delete from storage.objects where bucket_id = 'member-photos'
    and name like 'ffffffff-ffff-ffff-ffff-ffffffffffff/%'
$$), 2, 'service-rollen kan slette alle bilder i husstanden');

select tests.logout();
select is((select count(*)::int from storage.objects where bucket_id = 'member-photos'
    and name like 'ffffffff-ffff-ffff-ffff-ffffffffffff/%'),
  0, 'ingen bilder igjen i husstanden');

-- my_photo_folders_to_delete er uendret: voksen med andre voksne får bare sin egen mappe.
select tests.login_as('00000000-0000-0000-0000-00000000f002');
select is(public.my_photo_folders_to_delete(),
  array['ffffffff-ffff-ffff-ffff-ffffffffffff/ffffffff-0000-0000-0000-000000000002'],
  'voksen F2 får sin egen mappe å slette');

select tests.logout();
select * from finish();
rollback;
