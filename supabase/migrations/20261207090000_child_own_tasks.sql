-- Barnet legger inn egne oppgaver uten lønn, uten godkjenning. Se docs/DATABASE.md (tasks,
-- task_proposals) og §5.
--
-- Prinsipp: å ta ansvar uten betaling skal være det enkleste. Penger krever en avtale med en voksen.
--   Vil gjøre, uten lønn: engangsoppgave til barnet for i dag (add_own_task).
--   Gjort, uten lønn:     engangsjobb til barnet, krysset av med en gang via complete_task
--                         (uendret), med barnet som utfører. Jobben arkiveres, som for godkjente
--                         forslag, så den ikke blir stående i «Oppgaver».
--   Med lønn:             forslag til de voksne (submit_task_proposal), som før.
--
-- Ingen ny kolonne: tasks_set_defaults setter created_by = innlogget medlem, også i en
-- security definer-funksjon (auth.uid() er fortsatt barnet). Barn kan ikke sette inn i tasks
-- direkte (RLS), så created_by = et barn betyr at barnet la inn oppgaven selv.

-- ---------------------------------------------------------------------------
-- today_completions: hvem som la inn oppgaven («Lagt inn av Leah»). Ny kolonne sist. Ellers uendret.
-- ---------------------------------------------------------------------------
create or replace view public.today_completions
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
       ) as is_latest,
       t.job_member_ids,
       t.created_by as task_created_by
from public.task_completions c
join public.tasks t on t.id = c.task_id
where c.completed_on = private.household_today(c.household_id)
  and c.status <> 'rejected';

-- ---------------------------------------------------------------------------
-- add_own_task: «Legg til» (ikke gjort) og «Registrer» (gjort). Aldri lønn, alltid til barnet
-- selv: det finnes verken beløp- eller medlemsparameter.
-- Gjort: returnerer resultatet fra complete_task (til feiringen). Ikke gjort: bare task_id.
-- ---------------------------------------------------------------------------
create function public.add_own_task(p_title text, p_is_done boolean)
returns table (task_id uuid, completion_id uuid, feedback_text text, next_due_on date,
               reward_nok integer, status public.completion_status, feedback_kind text)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me      public.members;
  v_enabled boolean;
  v_tz      text;
  v_today   date;
  v_title   text := btrim(coalesce(p_title, ''));
  v_count   int;
  v_task    uuid;
begin
  -- Låser barnets rad, så grensen på 10 holder ved samtidige kall (samme lås som
  -- submit_task_proposal).
  select * into v_me from public.members m
  where m.auth_user_id = auth.uid() and m.role = 'child'
  for update;
  if not found then
    raise exception 'not_child' using errcode = 'P0001';
  end if;

  if not private.household_has_access(v_me.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  select h.child_proposals_enabled, h.timezone into v_enabled, v_tz
  from public.households h where h.id = v_me.household_id;
  if not v_enabled then
    raise exception 'proposals_disabled' using errcode = 'P0001';
  end if;

  if char_length(v_title) not between 1 and 60 or p_is_done is null then
    raise exception 'invalid_title' using errcode = 'P0001';
  end if;

  -- Maks 10 egne per dag, begge typer. Arkiverte teller også, så sletting og angring gir ikke
  -- flere. Oppgaver fra godkjente forslag har en voksen som created_by og teller ikke.
  v_today := private.household_today(v_me.household_id);
  select count(*) into v_count from public.tasks t
  where t.household_id = v_me.household_id
    and t.created_by = v_me.id
    and (t.created_at at time zone v_tz)::date = v_today;
  if v_count >= 10 then
    raise exception 'too_many_own_tasks' using errcode = 'P0001';
  end if;

  if p_is_done then
    -- Engangsjobb bare for barnet. complete_task krysser av med barnet som utfører (ingen lønn,
    -- status approved) og arkiverer jobben.
    insert into public.tasks (household_id, title, category, recurrence_type, job_repeats,
                              job_member_ids)
    values (v_me.household_id, v_title, 'other', 'job', false, array[v_me.id])
    returning id into v_task;

    return query
      select v_task, r.completion_id, r.feedback_text, r.next_due_on, r.reward_nok, r.status,
             r.feedback_kind
      from public.complete_task(p_task_id => v_task, p_member_id => v_me.id,
                                p_last_today => false) r;
  else
    -- Engangsoppgave til barnet for i dag. Krysses av som vanlig.
    insert into public.tasks (household_id, title, category, assigned_member_id, recurrence_type,
                              once_on)
    values (v_me.household_id, v_title, 'other', v_me.id, 'once', v_today)
    returning id into v_task;

    return query
      select v_task, null::uuid, null::text, null::date, null::integer,
             null::public.completion_status, null::text;
  end if;
end;
$$;

revoke execute on function public.add_own_task(text, boolean) from public, anon;
grant  execute on function public.add_own_task(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_task_proposal: bare med lønn. Uten lønn trengs ingen godkjenning (add_own_task).
-- Ellers uendret. Ventende forslag uten lønn fra før kan fortsatt avgjøres.
-- ---------------------------------------------------------------------------
create or replace function public.submit_task_proposal(p_title text, p_is_done boolean,
                                                       p_wants_reward boolean,
                                                       p_proposed_nok integer default null)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  me      public.members;
  enabled boolean;
  title   text := btrim(coalesce(p_title, ''));
  waiting int;
  new_id  uuid;
begin
  -- Låser barnets rad, så to samtidige kall ikke begge slipper forbi grensen.
  select * into me from public.members
  where auth_user_id = auth.uid() and role = 'child'
  for update;
  if not found then
    raise exception 'not_child' using errcode = 'P0001';
  end if;

  if not private.household_has_access(me.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  select h.child_proposals_enabled into enabled from public.households h where h.id = me.household_id;
  if not enabled then
    raise exception 'proposals_disabled' using errcode = 'P0001';
  end if;

  if char_length(title) not between 1 and 60 or p_is_done is null or p_wants_reward is null then
    raise exception 'invalid_title' using errcode = 'P0001';
  end if;

  -- Uten lønn trengs ingen godkjenning: da brukes add_own_task.
  if not p_wants_reward then
    raise exception 'reward_required' using errcode = 'P0001';
  end if;

  if p_proposed_nok is not null and p_proposed_nok not between 1 and 200 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select count(*) into waiting from public.task_proposals
  where member_id = me.id and status = 'pending';
  if waiting >= 5 then
    raise exception 'too_many_pending' using errcode = 'P0001';
  end if;

  insert into public.task_proposals (household_id, member_id, title, is_done, wants_reward, proposed_nok)
  values (me.household_id, me.id, title, p_is_done, p_wants_reward, p_proposed_nok)
  returning id into new_id;

  return new_id;
end;
$$;
