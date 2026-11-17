-- Ledige jobber for utvalgte barn (ikke bare ett eller alle). Se docs/DATABASE.md §1–2.
--
-- tasks.job_member_ids: barna som kan ta jobben. Tom liste = alle barna.
-- For jobber brukes ikke assigned_member_id lenger, så det finnes bare ett sted å se.
--
-- En liste i stedet for en koblingstabell: jobben lagres i ett kall og følger med i
-- today_tasks. En liste kan ikke ha FK, så en trigger sjekker innholdet, og en annen
-- fjerner barn som slettes.

-- ---------------------------------------------------------------------------
-- Kolonne og flytting av eksisterende jobber
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column job_member_ids uuid[] not null default '{}';

-- Jobber for ett barn får barnet i listen.
update public.tasks
set job_member_ids = array[assigned_member_id],
    assigned_member_id = null
where recurrence_type = 'job' and assigned_member_id is not null;

alter table public.tasks
  -- Listen gjelder bare jobber.
  add constraint tasks_job_members_only_jobs check (
    job_member_ids = '{}' or recurrence_type = 'job'),
  -- Jobber bruker listen, ikke én ansvarlig.
  add constraint tasks_job_no_assignee check (
    assigned_member_id is null or recurrence_type <> 'job');

grant insert (job_member_ids) on public.tasks to authenticated;
grant update (job_member_ids) on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Bare barn i samme husstand, uten duplikater
-- security definer: leser members uavhengig av RLS. Gir bare ja/nei, aldri data tilbake.
-- ---------------------------------------------------------------------------
create function private.tasks_check_job_members()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if cardinality(new.job_member_ids) = 0 then
    return new;
  end if;

  if cardinality(new.job_member_ids)
     <> (select count(distinct x) from unnest(new.job_member_ids) as x) then
    raise exception 'invalid_member' using errcode = '23514', detail = 'duplicate member';
  end if;

  if exists (
    select 1
    from unnest(new.job_member_ids) as x
    where not exists (
      select 1 from public.members m
      where m.id = x and m.household_id = new.household_id and m.role = 'child'
    )
  ) then
    raise exception 'invalid_member' using errcode = '23514', detail = 'not a child in this household';
  end if;

  return new;
end;
$$;

create trigger tasks_check_job_members
  before insert or update of job_member_ids on public.tasks
  for each row execute function private.tasks_check_job_members();

-- ---------------------------------------------------------------------------
-- Slettes et barn, fjernes det fra jobbene (som on delete set null for assigned_member_id).
-- Blir listen tom, er jobben åpen for alle barna.
-- ---------------------------------------------------------------------------
create function private.members_remove_from_jobs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.tasks
  set job_member_ids = array_remove(job_member_ids, old.id)
  where household_id = old.household_id and old.id = any (job_member_ids);
  return old;
end;
$$;

create trigger members_remove_from_jobs
  after delete on public.members
  for each row execute function private.members_remove_from_jobs();

-- ---------------------------------------------------------------------------
-- today_tasks: lages på nytt fordi t.* har fått en ny kolonne. Ellers uendret.
-- ---------------------------------------------------------------------------
drop view public.today_tasks;

create view public.today_tasks
with (security_invoker = true)
as
select t.*,
       coalesce(private.is_overdue(t, private.household_today(t.household_id)), false) as is_overdue,
       private.is_month_task(t) as is_month_task,
       private.due_by(t)        as due_by
from public.tasks t
where t.archived_at is null
  and (t.next_due_on <= private.household_today(t.household_id) or t.recurrence_type = 'job');

revoke all on public.today_tasks from anon, authenticated;
grant select on public.today_tasks to authenticated;
