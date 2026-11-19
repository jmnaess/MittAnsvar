-- Daglige oppgaver blir aldri forfalt. En daglig oppgave som ikke ble gjort, starter bare på nytt
-- neste dag den skal gjøres.
--
-- Daglig (private.is_daily): hver dag (fast kalender eller 1 dag etter sist), eller hver uke på
-- minst alle hverdagene (man–fre, man–lør eller alle 7 dager). Samme regel i appen
-- (isDailyRecurrence i src/features/tasks/recurrence.ts).
--
-- next_due_on blir stående på den glemte dagen. Det er bare visningen som endres:
--   - is_overdue er alltid false for daglige.
--   - today_tasks viser en daglig oppgave bare på dager den skal gjøres (matches_pattern), eller
--     på datoen den er utsatt til. Ellers ville en man–fre-oppgave fra fredag ligge i «I dag»
--     hele helgen.
-- Avkrysning gir likevel riktig neste frist: compute_next_due bruker
-- greatest(next_due_on, completed_on).

create function private.is_daily(t public.tasks)
returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce(
    (t.recurrence_type in ('calendar', 'interval')
      and t.recurrence_unit = 'day' and t.recurrence_every = 1)
    or (t.recurrence_type = 'calendar'
      and t.recurrence_unit = 'week' and t.recurrence_every = 1
      and t.weekdays @> array[1, 2, 3, 4, 5]::smallint[]),
    false);
$$;

create or replace function private.is_overdue(t public.tasks, today date)
returns boolean
language sql immutable set search_path = ''
as $$
  select not private.is_daily(t) and private.due_by(t) < today;
$$;

-- ---------------------------------------------------------------------------
-- today_tasks: som i 20261119090000_seasonal_tasks.sql, pluss vilkåret for daglige.
-- ---------------------------------------------------------------------------
drop view public.today_tasks;

create view public.today_tasks
with (security_invoker = true)
as
select t.*,
       coalesce(private.is_overdue(t, private.household_today(t.household_id)), false) as is_overdue,
       private.is_month_task(t) and not private.is_postponed(t) as is_month_task,
       private.due_by(t)        as due_by
from public.tasks t
where t.archived_at is null
  and (
    t.recurrence_type = 'job'
    or (t.next_due_on <= private.household_today(t.household_id)
        and (not private.is_daily(t)
             or t.next_due_on = private.household_today(t.household_id)
             or private.matches_pattern(t, private.household_today(t.household_id))))
  );

revoke all on public.today_tasks from anon, authenticated;
grant select on public.today_tasks to authenticated;

-- Nye funksjoner i private får execute til public som standard.
revoke execute on function private.is_daily(public.tasks) from public, anon;
grant execute on function private.is_daily(public.tasks) to authenticated;
