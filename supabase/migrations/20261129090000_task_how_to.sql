-- «Slik gjør du»: kilde på malene, og forklaringen på familieskjermen.
-- Se docs/DATABASE.md §4 og §5.
--
-- 1. task_templates.source_name: hvem rådet kommer fra («DSB»). source_url fantes fra før.
--    Kilden kopieres ikke til tasks. Appen slår opp malen via tasks.template_id og viser kilden
--    bare når oppgavens beskrivelse fortsatt er lik malens (src/features/tasks/howTo.ts).
--
-- 2. get_family_board: tasks og upcoming_tasks får description og template (det howTo.ts trenger
--    fra malen: beskrivelse, kilde og gjentakelse, null uten mal). Før fikk skjermen ikke
--    beskrivelser. Fortsatt ikke fødselsår, auth_user_id, recorded_by, saldo eller utbetalinger.

-- ---------------------------------------------------------------------------
-- 1. source_name
-- ---------------------------------------------------------------------------
alter table public.task_templates
  add column source_name text check (char_length(btrim(source_name)) between 1 and 80),
  add constraint task_templates_source_url_needs_name check (source_url is null or source_name is not null);

-- ---------------------------------------------------------------------------
-- 2. get_family_board
-- ---------------------------------------------------------------------------

-- Malen slik familieskjermen får den. null = ingen mal.
create function private.board_template(p_template_id uuid)
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  select jsonb_build_object(
    'description', tt.description,
    'source_name', tt.source_name,
    'source_url', tt.source_url,
    'recurrence_type', tt.recurrence_type,
    'recurrence_unit', tt.recurrence_unit,
    'season_start_month', tt.season_start_month
  )
  from public.task_templates tt
  where tt.id = p_template_id;
$$;

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
        'description', t.description,
        'template', private.board_template(t.template_id),
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
    -- Bare det buildUpcoming, describeRecurrence, UpcomingCard og howTo.ts trenger.
    'upcoming_tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'household_id', t.household_id,
        'title', t.title,
        'description', t.description,
        'template', private.board_template(t.template_id),
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

-- Brukes bare inne i get_family_board (security definer), så ingen trenger å kalle den direkte.
-- Ikke «grant ... on all functions in schema private»: det ville åpnet funksjoner som er stengt.
revoke execute on function private.board_template(uuid) from public, anon, authenticated;
