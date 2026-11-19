-- Familieskjermen: koble fra seg selv, og data til personvisningen.
-- Se docs/ARCHITECTURE.md §3 og docs/DATABASE.md §5.
--
-- 1. unlink_this_display: skjermen kobler fra seg selv fra innstillingene («Koble fra denne
--    skjermen»). Samme virkning som når en voksen kobler fra (unlink_display): raden forsvinner og
--    den anonyme brukeren slettes. Ingen parameter, så skjermen kan bare koble fra seg selv.
--
-- 2. get_family_board får tre nye nøkler til personvisningen («Kommende» og «Gjort siste 3 dager»):
--      upcoming_tasks  aktive oppgaver med ansvarlig person (ikke jobber, ikke felles)
--      occurrences     forekomstene deres fra i morgen og 14 dager fram
--      recent          avkrysninger fra i går og tre dager bakover, uten avviste
--    Samme utelatelser som før: ikke fødselsår, auth_user_id, beskrivelser, recorded_by, saldo
--    eller utbetalinger.
--
-- Feil (errcode P0001, nøkkel som melding, se src/lib/errors.ts):
--   unlink_this_display: not_display (kalleren er ikke en koblet familieskjerm)

-- ---------------------------------------------------------------------------
-- unlink_this_display
-- ---------------------------------------------------------------------------
create function public.unlink_this_display()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  d public.household_displays;
begin
  select * into d from public.household_displays where auth_user_id = auth.uid() for update;

  if not found then
    raise exception 'not_display' using errcode = 'P0001';
  end if;

  delete from public.household_displays where id = d.id;
  perform private.delete_anonymous_users(array[d.auth_user_id]);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_family_board: som i 20261120100000_family_display.sql, pluss personvisningen.
--
-- Viktig: today_tasks, today_completions og get_upcoming_occurrences er security invoker, og her
-- kjører vi som eieren av funksjonen. RLS gjelder dermed ikke, så hver spørring MÅ filtrere på
-- husstanden.
--
-- Vinduet på 14 dager må være likt CHILD_UPCOMING_DAYS i src/features/tasks/upcoming.ts:
-- skjermen bruker barnets regler for «Kommende».
-- ---------------------------------------------------------------------------
create or replace function public.get_family_board()
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  hid   uuid := private.my_display_household();
  today date;
begin
  if hid is null then
    return null;
  end if;

  today := private.household_today(hid);

  return jsonb_build_object(
    'household_id', hid,
    'household_name', (select h.name from public.households h where h.id = hid),
    'today', today,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'household_id', m.household_id,
        'role', m.role,
        'display_name', m.display_name,
        'avatar', m.avatar,
        'avatar_mode', m.avatar_mode,
        'photo_path', case when m.avatar_mode = 'photo' then m.photo_path end
      ) order by m.role, m.created_at)
      from public.members m
      where m.household_id = hid
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'household_id', t.household_id,
        'title', t.title,
        'assigned_member_id', t.assigned_member_id,
        'reward_nok', t.reward_nok,
        'recurrence_type', t.recurrence_type,
        'recurrence_unit', t.recurrence_unit,
        'recurrence_every', t.recurrence_every,
        'weekdays', t.weekdays,
        'month_day', t.month_day,
        'month', t.month,
        'job_repeats', t.job_repeats,
        'job_member_ids', t.job_member_ids,
        'season_start_month', t.season_start_month,
        'season_end_month', t.season_end_month,
        'next_due_on', t.next_due_on,
        'is_overdue', t.is_overdue,
        'is_month_task', t.is_month_task
      ) order by t.next_due_on nulls last, t.title)
      from public.today_tasks t
      where t.household_id = hid
    ), '[]'::jsonb),
    'completions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'household_id', c.household_id,
        'task_id', c.task_id,
        'completed_by_member_id', c.completed_by_member_id,
        'recorded_by', case when c.recorded_by = auth.uid() then c.recorded_by end,
        'completed_at', c.completed_at,
        'reward_nok', c.reward_nok,
        'status', c.status,
        'title', c.title,
        'assigned_member_id', c.assigned_member_id,
        'recurrence_type', c.recurrence_type,
        'job_member_ids', c.job_member_ids,
        'is_latest', c.is_latest
      ) order by c.completed_at)
      from public.today_completions c
      where c.household_id = hid
    ), '[]'::jsonb),
    -- Bare det buildUpcoming, describeRecurrence og UpcomingCard trenger.
    'upcoming_tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'household_id', t.household_id,
        'title', t.title,
        'assigned_member_id', t.assigned_member_id,
        'reward_nok', t.reward_nok,
        'recurrence_type', t.recurrence_type,
        'recurrence_unit', t.recurrence_unit,
        'recurrence_every', t.recurrence_every,
        'weekdays', t.weekdays,
        'month_day', t.month_day,
        'month', t.month,
        'job_repeats', t.job_repeats,
        'job_member_ids', t.job_member_ids,
        'season_start_month', t.season_start_month,
        'season_end_month', t.season_end_month,
        'next_due_on', t.next_due_on,
        'postponed_to', t.postponed_to
      ) order by t.title)
      from public.tasks t
      where t.household_id = hid
        and t.archived_at is null
        and t.recurrence_type <> 'job'
        and t.next_due_on is not null
        and t.assigned_member_id is not null
    ), '[]'::jsonb),
    'occurrences', coalesce((
      select jsonb_agg(jsonb_build_object('task_id', o.task_id, 'due_on', o.due_on)
                       order by o.due_on, o.task_id)
      from public.get_upcoming_occurrences(hid, today + 1, today + 14) o
      join public.tasks t on t.id = o.task_id
      where t.household_id = hid
        and t.recurrence_type <> 'job'
        and t.assigned_member_id is not null
    ), '[]'::jsonb),
    -- Som viewet recent_completions, men filtrert på husstanden her.
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'household_id', c.household_id,
        'task_id', c.task_id,
        'completed_by_member_id', c.completed_by_member_id,
        'completed_on', c.completed_on,
        'completed_at', c.completed_at,
        'reward_nok', c.reward_nok,
        'status', c.status,
        'title', t.title,
        'recurrence_type', t.recurrence_type
      ) order by c.completed_at desc)
      from public.task_completions c
      join public.tasks t on t.id = c.task_id
      where c.household_id = hid
        and c.completed_on between today - 3 and today - 1
        and c.status <> 'rejected'
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Rettigheter
-- ---------------------------------------------------------------------------
revoke execute on function public.unlink_this_display() from public, anon;
grant  execute on function public.unlink_this_display() to authenticated;
