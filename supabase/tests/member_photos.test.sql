-- Tester for profilbilder: storage-policyer, kolonner, set_my_avatar_mode og
-- my_photo_folders_to_delete. Se migrasjonen *_member_photos.sql.
-- Alt kjøres i én transaksjon som rulles tilbake, så ingen testdata blir liggende.
begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

-- ---------------------------------------------------------------------------
-- Testhjelpere (samme som i child_settings.test.sql)
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

-- Antall bildefiler med denne stien som innlogget bruker kan se.
create function tests.visible(path text)
returns int language sql as $$
  select count(*)::int from storage.objects where bucket_id = 'member-photos' and name = path;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- Storage-API-et sletter på denne måten; uten innstillingen stopper storage.protect_delete
-- alle DELETE med SQL (også for superbruker). RLS gjelder fortsatt.
set local storage.allow_delete_query = 'true';

-- ---------------------------------------------------------------------------
-- Testdata (som superbruker)
--   Husstand C: voksen C1, voksen C2, barn C med enhet, barn C uten enhet
--   Husstand D: voksen D1 (eneste voksne), barn D uten enhet
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000c001', 'voksen-c1@example.com', false),
  ('00000000-0000-0000-0000-00000000c002', 'voksen-c2@example.com', false),
  ('00000000-0000-0000-0000-00000000c003', null, true),
  ('00000000-0000-0000-0000-00000000d001', 'voksen-d1@example.com', false);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Familien C', 'family', 'house',     now() + interval '14 days'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Familien D', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id, created_at) values
  ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C1', 'fox',  null, '00000000-0000-0000-0000-00000000c001', now() - interval '4 min'),
  ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'adult', 'Voksen C2', 'cat',  null, '00000000-0000-0000-0000-00000000c002', now() - interval '3 min'),
  ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'child', 'Barn C',    'owl',  2016, '00000000-0000-0000-0000-00000000c003', now() - interval '2 min'),
  ('cccccccc-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'child', 'Søsken C',  'frog', 2019, null,                                   now() - interval '1 min'),
  ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'adult', 'Voksen D1', 'bear', null, '00000000-0000-0000-0000-00000000d001', now() - interval '2 min'),
  ('dddddddd-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'child', 'Barn D',    'lion', 2015, null,                                   now() - interval '1 min');

-- ===========================================================================
-- 1. Bøtta
-- ===========================================================================
select is((select public from storage.buckets where id = 'member-photos'), false,
  'bøtta member-photos er privat');

-- ===========================================================================
-- 2. Opplasting (insert)
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000c001');

select lives_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000004/11111111-1111-1111-1111-111111111111.jpg')
$$, 'voksen kan laste opp bilde av et barn i egen husstand');

select throws_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000002/22222222-2222-2222-2222-222222222222.jpg')
$$, '42501', null, 'voksen kan ikke laste opp bilde av en annen voksen (se own_adult_profile.test.sql)');

select lives_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000003/33333333-3333-3333-3333-333333333333.jpg')
$$, 'voksen kan laste opp bilde av barnet med enhet');

select throws_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'dddddddd-dddd-dddd-dddd-dddddddddddd/dddddddd-0000-0000-0000-000000000002/44444444-4444-4444-4444-444444444444.jpg')
$$, '42501', null, 'voksen kan ikke laste opp i en annen husstand');

select throws_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-0000-0000-0000-000000000002/44444444-4444-4444-4444-444444444444.jpg')
$$, '42501', null, 'egen husstand + medlem fra en annen husstand avvises');

select throws_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-00000000ffff/44444444-4444-4444-4444-444444444444.jpg')
$$, '42501', null, 'sti til et medlem som ikke finnes, avvises');

select throws_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000004/bilde.png')
$$, '42501', null, 'filnavn som ikke er {uuid}.jpg, avvises');

select throws_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/44444444-4444-4444-4444-444444444444.jpg')
$$, '42501', null, 'fil rett i husstandsmappen (uten medlem) avvises');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000c003');
select throws_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000003/55555555-5555-5555-5555-555555555555.jpg')
$$, '42501', null, 'barn kan ikke laste opp bilde av seg selv');

select tests.login_as('00000000-0000-0000-0000-00000000d001');
select lives_ok($$
  insert into storage.objects (bucket_id, name) values
    ('member-photos', 'dddddddd-dddd-dddd-dddd-dddddddddddd/dddddddd-0000-0000-0000-000000000002/66666666-6666-6666-6666-666666666666.jpg')
$$, 'voksen D1 kan laste opp i sin husstand');

-- ===========================================================================
-- 3. Lesing (select)
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000c002');
select is(tests.visible('cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000004/11111111-1111-1111-1111-111111111111.jpg'),
  1, 'annen voksen i husstanden kan lese bildet');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000c003');
select is(tests.visible('cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000004/11111111-1111-1111-1111-111111111111.jpg'),
  1, 'barn med enhet kan lese bilder i egen husstand');

select tests.login_as('00000000-0000-0000-0000-00000000d001');
select is(tests.visible('cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000004/11111111-1111-1111-1111-111111111111.jpg'),
  0, 'annen husstand kan ikke lese bildet');
select is((select count(*)::int from storage.objects where bucket_id = 'member-photos'),
  1, 'annen husstand ser bare sine egne bilder');

select set_config('role', 'anon', true);
select is((select count(*)::int from storage.objects where bucket_id = 'member-photos'),
  0, 'anon ser ingen bilder');

-- ===========================================================================
-- 4. Sletting (delete)
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000c003');
select is(tests.affected($$
  delete from storage.objects where bucket_id = 'member-photos'
    and name like 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000003/%'
$$), 0, 'barn kan ikke slette bilde av seg selv');

select tests.login_as('00000000-0000-0000-0000-00000000d001');
select is(tests.affected($$
  delete from storage.objects where bucket_id = 'member-photos'
    and name like 'cccccccc-cccc-cccc-cccc-cccccccccccc/%'
$$), 0, 'annen husstand kan ikke slette bilder');

select tests.login_as('00000000-0000-0000-0000-00000000c002');
select is(tests.affected($$
  delete from storage.objects where bucket_id = 'member-photos'
    and name like 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000003/%'
$$), 1, 'voksen kan slette bilde i egen husstand');

-- ===========================================================================
-- 5. Kolonnene photo_path og avatar_mode
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000c001');
select lives_ok($$
  update public.members
    set photo_path = 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000004/11111111-1111-1111-1111-111111111111.jpg',
        avatar_mode = 'photo'
  where id = 'cccccccc-0000-0000-0000-000000000004'
$$, 'voksen kan sette photo_path og avatar_mode');

select throws_ok($$
  update public.members
    set photo_path = 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000004/11111111-1111-1111-1111-111111111111.jpg'
  where id = 'cccccccc-0000-0000-0000-000000000003'
$$, '23514', null, 'photo_path kan ikke peke på en annen persons mappe');

select throws_ok($$
  update public.members set photo_path = null where id = 'cccccccc-0000-0000-0000-000000000004'
$$, '23514', null, 'bilde-modus uten bilde avvises (fjernes bildet, må modusen bli figur)');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000c003');
select is(tests.affected($$
  update public.members set photo_path = null where id = 'cccccccc-0000-0000-0000-000000000004'
$$), 0, 'barn kan ikke endre photo_path');

-- set_my_avatar_mode
select throws_ok($$select public.set_my_avatar_mode('photo')$$, 'P0001', 'no_photo',
  'barn uten bilde kan ikke velge bilde');

select tests.logout();
update public.members
  set photo_path = 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000003/33333333-3333-3333-3333-333333333333.jpg'
where id = 'cccccccc-0000-0000-0000-000000000003';

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000c003');
select lives_ok($$select public.set_my_avatar_mode('photo')$$, 'barn med bilde kan velge bilde');
select lives_ok($$select public.set_my_avatar_mode('figure')$$, 'barn kan velge figuren igjen');

select tests.logout();
select is(
  (select array_agg(avatar_mode::text order by id) from public.members where id in
    ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000004')),
  array['figure', 'photo'],
  'set_my_avatar_mode endret bare barnets egen rad');

-- ===========================================================================
-- 6. Sletting rydder: my_photo_folders_to_delete og lesing etter sletting
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000c001');
select is(public.my_photo_folders_to_delete(),
  array['cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000001'],
  'voksen med andre voksne: bare egen mappe');

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000c003');
select is(public.my_photo_folders_to_delete(), '{}'::text[],
  'barn: ingen mapper (barneprofilen tilhører husstanden)');

select tests.login_as('00000000-0000-0000-0000-00000000d001');
select is(public.my_photo_folders_to_delete(),
  array['dddddddd-dddd-dddd-dddd-dddddddddddd/dddddddd-0000-0000-0000-000000000001',
        'dddddddd-dddd-dddd-dddd-dddddddddddd/dddddddd-0000-0000-0000-000000000002'],
  'siste voksne: alle mapper i husstanden');

-- En fil som blir liggende igjen etter at personen er slettet, kan ingen lese.
select tests.logout();
-- C2 laster opp sitt eget bilde (som superbruker her, C1 kan ikke gjøre det).
insert into storage.objects (bucket_id, name) values
  ('member-photos', 'cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000002/22222222-2222-2222-2222-222222222222.jpg');
delete from public.members where id = 'cccccccc-0000-0000-0000-000000000002';
select tests.login_as('00000000-0000-0000-0000-00000000c001');
select is(tests.visible('cccccccc-cccc-cccc-cccc-cccccccccccc/cccccccc-0000-0000-0000-000000000002/22222222-2222-2222-2222-222222222222.jpg'),
  0, 'bilde av et slettet medlem kan ikke leses');

select tests.logout();
select * from finish();
rollback;
