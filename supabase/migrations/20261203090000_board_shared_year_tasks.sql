-- Familieskjermen: felles årshjul-oppgaver i personvisningens «Kommende».
--
-- Bare get_family_board endres. upcoming_tasks og occurrences tar nå også med felles
-- årshjul-oppgaver (uten ansvarlig). Før: bare oppgaver med ansvarlig person.
-- Klienten viser dem bare når en voksen er valgt i familieraden, aldri for et barn
-- (boardPersonView i src/features/display/personView.ts). Tavla er én for hele skjermen, så
-- databasen vet ikke hvem som er valgt. Skjermen ser allerede felles oppgaver i «Felles».
--
-- «Årshjul-oppgave» er nøyaktig samme regel som taskSection(t) = 'year' i
-- src/features/tasks/section.ts. Paritetstesten i supabase/tests/family_display_shared_year.test.sql
-- og section.test.ts bruker samme liste med tilfeller.
--
-- Uendret: alle andre nøkler, alle felt i objektene (ingen nye), grant/revoke.

create or replace function public.get_family_board()
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  hid          uuid := private.my_display_household();
  today        date;
  upcoming_ids uuid[];
begin
  if hid is null then
    return null;
  end if;

  today := private.household_today(hid);

  -- Personvisningens «Kommende»: aktive oppgaver med frist (ikke jobber) som har ansvarlig, eller
  -- er felles årshjul-oppgaver. Regnes én gang, så upcoming_tasks og occurrences følger samme regel.
  -- Årshjul = taskSection(t) = 'year' i section.ts, gren for gren:
  --   once/job          -> aldri (once/job er utelatt av «in ('calendar', 'interval')»)
  --   isSeasonal        -> season_start_month is not null
  --   calendar + year   -> årlig (også månedsoppgaver: month_day is null)
  --   isLongInterval    -> interval, unit ikke null, og year, eller every >= 90 d / 13 u / 3 mnd
  select coalesce(array_agg(t.id), '{}') into upcoming_ids
  from public.tasks t
  where t.household_id = hid
    and t.archived_at is null
    and t.recurrence_type <> 'job'
    and t.next_due_on is not null
    and (
      t.assigned_member_id is not null
      or (
        t.recurrence_type in ('calendar', 'interval')
        and (
          t.season_start_month is not null
          or (t.recurrence_type = 'calendar' and t.recurrence_unit = 'year')
          or (t.recurrence_type = 'interval' and (
                t.recurrence_unit = 'year'
             or (t.recurrence_unit = 'day'   and coalesce(t.recurrence_every, 1) >= 90)
             or (t.recurrence_unit = 'week'  and coalesce(t.recurrence_every, 1) >= 13)
             or (t.recurrence_unit = 'month' and coalesce(t.recurrence_every, 1) >= 3)))
        )
      )
    );

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
    -- Bare det buildUpcoming, describeRecurrence, UpcomingCard og howTo.ts trenger. Se upcoming_ids.
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
      where t.id = any(upcoming_ids)
    ), '[]'::jsonb),
    'occurrences', coalesce((
      select jsonb_agg(jsonb_build_object('task_id', o.task_id, 'due_on', o.due_on)
                       order by o.due_on, o.task_id)
      from public.get_upcoming_occurrences(hid, today + 1, today + 14) o
      where o.task_id = any(upcoming_ids)
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
