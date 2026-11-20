-- Hjelpefunksjoner i private som bare skal kalles fra security definer-funksjoner (eller av
-- systemet), ikke av innloggede eller anonyme brukere direkte. Se
-- *_close_private_helpers.sql. Alt rulles tilbake.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.closed(p_fn text, p_role text)
returns boolean language sql as $$
  select not has_function_privilege(p_role, p_fn::regprocedure, 'execute');
$$;

-- Stengt da de ble laget, åpnet ved en feil av seasonal_tasks, stengt igjen.
select ok(pg_temp.closed('private.delete_anonymous_users(uuid[])', 'authenticated'),                 'delete_anonymous_users: ikke authenticated');
select ok(pg_temp.closed('private.delete_anonymous_users(uuid[])', 'anon'),                          'delete_anonymous_users: ikke anon');
select ok(pg_temp.closed('private.assert_adult_for_completions(uuid[])', 'authenticated'),           'assert_adult_for_completions: ikke authenticated');
select ok(pg_temp.closed('private.assert_adult_for_completions(uuid[])', 'anon'),                    'assert_adult_for_completions: ikke anon');
select ok(pg_temp.closed('private.member_balance(uuid)', 'authenticated'),                           'member_balance: ikke authenticated');
select ok(pg_temp.closed('private.member_balance(uuid)', 'anon'),                                    'member_balance: ikke anon');
select ok(pg_temp.closed('private.lock_today_completion(uuid, uuid)', 'authenticated'),              'lock_today_completion: ikke authenticated');
select ok(pg_temp.closed('private.lock_today_completion(uuid, uuid)', 'anon'),                       'lock_today_completion: ikke anon');
select ok(pg_temp.closed('private.assert_reward_not_paid(public.task_completions)', 'authenticated'), 'assert_reward_not_paid: ikke authenticated');
select ok(pg_temp.closed('private.assert_reward_not_paid(public.task_completions)', 'anon'),         'assert_reward_not_paid: ikke anon');
select ok(pg_temp.closed('private.lock_task_for_adult(uuid)', 'authenticated'),                      'lock_task_for_adult: ikke authenticated');
select ok(pg_temp.closed('private.lock_task_for_adult(uuid)', 'anon'),                               'lock_task_for_adult: ikke anon');

-- Stengt fra før, og skal forbli det.
select ok(pg_temp.closed('private.roll_over_seasons(timestamptz)', 'authenticated'),                 'roll_over_seasons: ikke authenticated');
select ok(pg_temp.closed('private.delete_stale_anonymous_users(timestamptz)', 'authenticated'),      'delete_stale_anonymous_users: ikke authenticated');
select ok(pg_temp.closed('private.board_template(uuid)', 'authenticated'),                           'board_template: ikke authenticated');
select ok(pg_temp.closed('private.delete_old_task_proposals(timestamptz)', 'authenticated'),        'delete_old_task_proposals: ikke authenticated');
select ok(pg_temp.closed('private.delete_old_task_proposals(timestamptz)', 'anon'),                 'delete_old_task_proposals: ikke anon');

-- Ingen av dem gir execute til PUBLIC (alle roller).
select is(
  (select count(*)::int
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
   where n.nspname = 'private'
     and p.proname in ('delete_anonymous_users', 'assert_adult_for_completions', 'member_balance',
                       'lock_today_completion', 'assert_reward_not_paid', 'lock_task_for_adult')
     and a.grantee = 0 and a.privilege_type = 'EXECUTE'),
  0, 'ingen av de seks gir execute til PUBLIC');

-- Funksjonene i public som bruker dem, er security definer og eies av postgres, så de virker fortsatt.
select is(
  (select count(*)::int
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosrc ~ 'private\.(delete_anonymous_users|assert_adult_for_completions|member_balance|lock_today_completion|assert_reward_not_paid|lock_task_for_adult)\M'
     and not (p.prosecdef and pg_get_userbyid(p.proowner) = 'postgres')),
  0, 'alle funksjoner i public som kaller dem, er security definer eid av postgres');
select ok(
  (select count(*) >= 10
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosrc ~ 'private\.(delete_anonymous_users|assert_adult_for_completions|member_balance|lock_today_completion|assert_reward_not_paid|lock_task_for_adult)\M'),
  'sjekken over finner kallerne (ikke tom)');

select * from finish();
rollback;
