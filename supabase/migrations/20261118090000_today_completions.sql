-- Dagens avkrysninger til «I dag»: utførte oppgaver vises nederst i hver persons kort.
--
-- - «I dag» er datoen i husstandens tidssone (private.household_today), som i today_tasks.
-- - Avviste avkrysninger (status rejected) regnes som ikke gjort og er ikke med.
-- - security_invoker: viewet kjører som den innloggede, så RLS på task_completions og tasks
--   gjelder. Barn ser bare egne avkrysninger; voksne ser hele husstanden.
-- - Oppgaven er med selv om den er arkivert (en ledig jobb som er gjort, arkiveres).
-- - is_latest: ingen nyere avkrysning på samme oppgave. Bare den siste kan angres
--   (samme regel som undo_completion). Tidsgrensen på 10 minutter sjekker appen.

create view public.today_completions
with (security_invoker = true)
as
select c.id,
       c.household_id,
       c.task_id,
       c.completed_by_member_id,
       c.recorded_by,
       c.completed_at,
       c.reward_nok,
       c.status,
       t.title,
       t.assigned_member_id,
       t.recurrence_type,
       not exists (
         select 1 from public.task_completions x
         where x.task_id = c.task_id and x.completed_at > c.completed_at and x.status <> 'rejected'
       ) as is_latest
from public.task_completions c
join public.tasks t on t.id = c.task_id
where c.completed_on = private.household_today(c.household_id)
  and c.status <> 'rejected';

revoke all on public.today_completions from anon, authenticated;
grant select on public.today_completions to authenticated;
