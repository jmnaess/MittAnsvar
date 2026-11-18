-- Avkrysninger de tre siste dagene, til personvisningen i «I dag» («Gjort siste 3 dager»).
--
-- - Fra og med i går og tre dager bakover, i husstandens tidssone (private.household_today).
--   Dagens avkrysninger ligger i today_completions.
-- - Avviste avkrysninger (status rejected) regnes som ikke gjort og er ikke med.
-- - security_invoker: viewet kjører som den innloggede, så RLS på task_completions og tasks
--   gjelder. Barn ser bare egne avkrysninger; voksne ser hele husstanden. Derfor trengs ingen
--   security definer og ingen egne tilgangssjekker.
-- - Oppgaven er med selv om den er arkivert (en ledig jobb som er gjort, arkiveres).
-- - Bare visning: ingen is_latest, fordi listen ikke har handlinger.

create view public.recent_completions
with (security_invoker = true)
as
select c.id,
       c.household_id,
       c.task_id,
       c.completed_by_member_id,
       c.completed_on,
       c.completed_at,
       c.reward_nok,
       c.status,
       t.title,
       t.recurrence_type
from public.task_completions c
join public.tasks t on t.id = c.task_id
where c.completed_on between private.household_today(c.household_id) - 3
                         and private.household_today(c.household_id) - 1
  and c.status <> 'rejected';

revoke all on public.recent_completions from anon, authenticated;
grant select on public.recent_completions to authenticated;
