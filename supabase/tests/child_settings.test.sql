-- Tester for «Innstillinger» på barnets enhet: set_my_avatar og unlink_my_device.
-- Se migrasjonen *_child_settings.sql og docs/DATABASE.md §5. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

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

-- ---------------------------------------------------------------------------
-- Testdata
--   A: voksen A, barn A1 med enhet (a002), barn A2 med enhet (a003).
--   B: voksen B, barn B med enhet (b002).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a001', 'voksen-a@example.com', false),
  ('00000000-0000-0000-0000-00000000a002', null, true),
  ('00000000-0000-0000-0000-00000000a003', null, true),
  ('00000000-0000-0000-0000-00000000b001', 'voksen-b@example.com', false),
  ('00000000-0000-0000-0000-00000000b002', null, true);

insert into public.households (id, name, type, housing_type, trial_ends_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 'family', 'house',     now() + interval '14 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'family', 'apartment', now() + interval '14 days');

insert into public.members (id, household_id, role, display_name, avatar, birth_year, auth_user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'Voksen A', 'fox',  null, '00000000-0000-0000-0000-00000000a001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A1',  'owl',  2016, '00000000-0000-0000-0000-00000000a002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Barn A2',  'frog', 2014, '00000000-0000-0000-0000-00000000a003'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'Voksen B', 'cat',  null, '00000000-0000-0000-0000-00000000b001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child', 'Barn B',   'bear', 2015, '00000000-0000-0000-0000-00000000b002');

-- ===========================================================================
-- 1. Avatar: barnet kan endre sin egen, og ingenting annet
-- ===========================================================================
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');

select lives_ok($$select public.set_my_avatar('unicorn')$$, 'barnet kan velge ny avatar');
select throws_ok($$select public.set_my_avatar('')$$, 'P0001', 'invalid_avatar',
  'tom avatar avvises');
select throws_ok($$select public.set_my_avatar('<script>')$$, 'P0001', 'invalid_avatar',
  'avatar må være en nøkkel, ikke vilkårlig tekst');

-- Direkte i tabellen: bare voksne har update-policy, så barnet treffer ingen rader.
select is(tests.affected($$update public.members set display_name = 'Nytt navn'
                           where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$), 0,
  'barnet kan ikke endre sitt eget navn');
select is(tests.affected($$update public.members set birth_year = 2010
                           where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$), 0,
  'barnet kan ikke endre sitt eget fødselsår');
select throws_ok($$update public.members set role = 'adult'
                   where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$, '42501', null,
  'barnet kan ikke endre sin egen rolle (ingen kolonnerett)');
select throws_ok($$update public.members set auth_user_id = null
                   where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$, '42501', null,
  'barnet kan ikke endre sin egen kobling direkte');
select is(tests.affected($$update public.members set avatar = 'lion'
                           where id = 'aaaaaaaa-0000-0000-0000-000000000003'$$), 0,
  'barnet kan ikke endre søskens avatar direkte');
select is(tests.affected($$update public.members set avatar = 'lion'
                           where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$), 0,
  'barnet kan heller ikke endre sin egen avatar direkte (bare via set_my_avatar)');
select tests.logout();

select is((select avatar from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  'unicorn', 'barnets avatar er endret');
select is((select display_name || ' ' || birth_year || ' ' || role
           from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  'Barn A1 2016 child', 'barnets navn, fødselsår og rolle er uendret');
select is((select avatar from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'frog', 'søskens avatar er uendret');
select is((select avatar from public.members where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'bear', 'avataren til barnet i en annen husstand er uendret');

select tests.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select public.set_my_avatar('dog')$$, 'en voksen kan også bruke set_my_avatar');
select tests.logout();

-- ===========================================================================
-- 2. Koble fra seg selv: bare seg selv, og bare et barn
-- ===========================================================================
select tests.login_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.unlink_my_device()$$, 'P0001', 'invalid_member',
  'en voksen kan ikke bruke unlink_my_device');
select tests.logout();

select set_config('role', 'anon', true);
select throws_ok($$select public.unlink_my_device()$$, '42501', null,
  'anon kan ikke kalle unlink_my_device');
select tests.logout();

select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select lives_ok($$select public.unlink_my_device()$$, 'barnet kan koble fra sin egen enhet');
select tests.logout();

select is((select auth_user_id from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  null, 'barnets profil er ikke lenger koblet');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000a002'), 0,
  'barnets anonyme bruker er slettet');
select is((select count(*)::int from public.members
           where auth_user_id in ('00000000-0000-0000-0000-00000000a003',
                                  '00000000-0000-0000-0000-00000000b002')), 2,
  'søsken og barnet i en annen husstand er fortsatt koblet');

-- Den gamle sesjonen er ikke lenger noe medlem, og kan ikke koble fra noen.
select tests.login_as_anonymous('00000000-0000-0000-0000-00000000a002');
select throws_ok($$select public.unlink_my_device()$$, 'P0001', 'invalid_member',
  'etter frakobling er det ingen å koble fra');
select tests.logout();

select is((select count(*)::int from auth.users
           where id in ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-00000000b002')), 2,
  'de andre barnas anonyme brukere finnes fortsatt');

select * from finish();
rollback;
