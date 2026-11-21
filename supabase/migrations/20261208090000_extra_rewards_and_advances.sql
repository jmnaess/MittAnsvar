-- Lønn i ettertid, ekstra lønn og forskudd. Se docs/DATABASE.md §1 (extra_rewards,
-- member_balances), §3 (set_completion_reward) og §5.
--
--   - extra_rewards: en voksen gir et barn ekstra lønn, med en valgfri begrunnelse. Teller i
--     saldoen med én gang (ingen godkjenning).
--   - set_completion_reward: en voksen endrer beløpet på en godkjent avkrysning. 0 = ingen lønn.
--   - Forskudd: saldoen kan gå under 0. record_payout tillater beløp over saldoen, og sperren
--     reward_already_paid er fjernet fra set_completion_status, remove_completion og
--     reassign_completion. Appen spør før noe gir forskudd.
--
-- Feil (errcode P0001, nøkkel som melding, se src/lib/errors.ts):
--   not_adult, invalid_member, subscription_required, invalid_amount,
--   invalid_reason:        begrunnelsen er over 80 tegn
--   reward_not_changeable: avkrysningen er ikke godkjent, eller ble ikke gjort av et barn

-- ---------------------------------------------------------------------------
-- extra_rewards
-- ---------------------------------------------------------------------------
create table public.extra_rewards (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households (id) on delete cascade,
  -- Barnet. Slettes med barneprofilen (GDPR), som avkrysninger og utbetalinger.
  member_id            uuid not null,
  amount_nok           integer not null check (amount_nok between 1 and 10000),
  -- «Ekstra for at du hjalp Thelma». Trimmet av RPC-en, null = «Ekstra lønn».
  reason               text check (reason is null or char_length(reason) between 1 and 80),
  -- Husstandens dato da tillegget ble gitt (uka på barnets motivasjonskort).
  given_on             date not null,
  created_at           timestamptz not null default now(),
  -- Den voksne som ga tillegget.
  created_by_member_id uuid references public.members (id) on delete set null,

  constraint extra_rewards_member_fk
    foreign key (household_id, member_id)
    references public.members (household_id, id) on delete cascade
);

create index extra_rewards_member_idx
  on public.extra_rewards (household_id, member_id, created_at desc);

revoke all on public.extra_rewards from anon, authenticated;
grant select on public.extra_rewards to authenticated;
-- Ingen insert/update/delete: skjer via add_extra_reward og delete_extra_reward.

alter table public.extra_rewards enable row level security;

-- Som payouts: voksne ser alle barna i husstanden, barnet bare sine egne. Familieskjermen er
-- ikke medlem og ser ingenting.
create policy extra_rewards_select on public.extra_rewards
  for select to authenticated
  using (
    household_id in (select private.my_household_ids())
    and (private.is_adult(household_id) or member_id = private.my_member_id(household_id))
  );

-- ---------------------------------------------------------------------------
-- add_extra_reward: en voksen gir et barn ekstra lønn.
-- ---------------------------------------------------------------------------
create function public.add_extra_reward(p_member_id uuid, p_amount_nok integer,
                                        p_reason text default null)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  child  public.members;
  caller public.members;
  reason text;
  new_id uuid;
begin
  select * into child from public.members where id = p_member_id for update;

  select * into caller from public.members
  where household_id = child.household_id and auth_user_id = auth.uid();
  if not found or caller.role <> 'adult' then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  if child.role <> 'child' then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  if not private.household_has_access(child.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  if p_amount_nok is null or p_amount_nok < 1 or p_amount_nok > 10000 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  reason := nullif(btrim(p_reason), '');
  if char_length(reason) > 80 then
    raise exception 'invalid_reason' using errcode = 'P0001';
  end if;

  insert into public.extra_rewards
    (household_id, member_id, amount_nok, reason, given_on, created_by_member_id)
  values
    (child.household_id, child.id, p_amount_nok, reason,
     private.household_today(child.household_id), caller.id)
  returning id into new_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_extra_reward: en voksen angrer et tillegg. Ingen tidsgrense. Kan gi forskudd.
-- ---------------------------------------------------------------------------
create function public.delete_extra_reward(p_extra_reward_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  r public.extra_rewards;
begin
  select * into r from public.extra_rewards where id = p_extra_reward_id for update;
  if not found or not private.is_adult(r.household_id) then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  if not private.household_has_access(r.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  delete from public.extra_rewards where id = r.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_completion_reward: en voksen endrer lønnen på en godkjent avkrysning (0 = ingen lønn).
-- Bare beløpet endres: frist, status og oppgavens pris står. Kan gi forskudd.
-- ---------------------------------------------------------------------------
create function public.set_completion_reward(p_completion_id uuid, p_amount_nok integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c public.task_completions;
begin
  perform private.assert_adult_for_completions(array[p_completion_id]);

  select * into c from public.task_completions where id = p_completion_id for update;

  if c.status <> 'approved' or not exists (
    select 1 from public.members m where m.id = c.completed_by_member_id and m.role = 'child'
  ) then
    raise exception 'reward_not_changeable' using errcode = 'P0001';
  end if;

  if p_amount_nok is null or p_amount_nok < 0 or p_amount_nok > 10000 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  update public.task_completions
  set reward_nok = nullif(p_amount_nok, 0)
  where id = c.id;
end;
$$;

revoke execute on function public.add_extra_reward(uuid, integer, text)  from public, anon;
grant  execute on function public.add_extra_reward(uuid, integer, text)  to authenticated;
revoke execute on function public.delete_extra_reward(uuid)              from public, anon;
grant  execute on function public.delete_extra_reward(uuid)              to authenticated;
revoke execute on function public.set_completion_reward(uuid, integer)   from public, anon;
grant  execute on function public.set_completion_reward(uuid, integer)   to authenticated;

-- ---------------------------------------------------------------------------
-- member_balances: ekstra lønn teller, og balance_nok kan være under 0 (forskudd).
-- extra_nok legges til sist, så viewet kan erstattes uten å droppes.
-- ---------------------------------------------------------------------------
create or replace view public.member_balances
with (security_invoker = true)
as
select m.id           as member_id,
       m.household_id,
       e.earned_nok,
       p.paid_nok,
       e.earned_nok + x.extra_nok - p.paid_nok as balance_nok,
       e.pending_nok,
       x.extra_nok
from public.members m
cross join lateral (
  select coalesce(sum(c.reward_nok) filter (where c.status = 'approved'), 0)::int as earned_nok,
         coalesce(sum(c.reward_nok) filter (where c.status = 'pending'), 0)::int  as pending_nok
  from public.task_completions c
  where c.household_id = m.household_id and c.completed_by_member_id = m.id
) e
cross join lateral (
  select coalesce(sum(y.amount_nok), 0)::int as paid_nok
  from public.payouts y
  where y.household_id = m.household_id and y.member_id = m.id
) p
cross join lateral (
  select coalesce(sum(r.amount_nok), 0)::int as extra_nok
  from public.extra_rewards r
  where r.household_id = m.household_id and r.member_id = m.id
) x
where m.role = 'child'
  and (private.is_adult(m.household_id) or m.auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- record_payout: beløp over saldoen er lov (forskudd). Grensen er 1–10 000 kr.
-- ---------------------------------------------------------------------------
create or replace function public.record_payout(p_member_id uuid, p_amount_nok integer)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  child   public.members;
  caller  public.members;
  new_id  uuid;
begin
  select * into child from public.members where id = p_member_id for update;

  select * into caller from public.members
  where household_id = child.household_id and auth_user_id = auth.uid();
  if not found or caller.role <> 'adult' then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  if child.role <> 'child' then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  if not private.household_has_access(child.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  if p_amount_nok is null or p_amount_nok < 1 or p_amount_nok > 10000 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  insert into public.payouts (household_id, member_id, amount_nok, recorded_by_member_id)
  values (child.household_id, child.id, p_amount_nok, caller.id)
  returning id into new_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_completion_status: uten sperren reward_already_paid. Ellers uendret.
-- ---------------------------------------------------------------------------
create or replace function public.set_completion_status(p_completion_id uuid,
                                                        p_status public.completion_status)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c         public.task_completions;
  is_latest boolean;
begin
  perform private.assert_adult_for_completions(array[p_completion_id]);

  select * into c from public.task_completions where id = p_completion_id;

  -- Lås oppgaven (ingen krysser av samtidig mens vi sjekker «siste»), så raden.
  perform 1 from public.tasks where id = c.task_id for update;
  perform 1 from public.members where id = c.completed_by_member_id for update;
  select * into c from public.task_completions where id = p_completion_id for update;

  if p_status is null or p_status = 'pending' or c.status = 'pending'
     or c.status = p_status or c.reward_nok is null then
    raise exception 'status_not_changeable' using errcode = 'P0001';
  end if;

  is_latest := not exists (
    select 1 from public.task_completions x
    where x.task_id = c.task_id and x.completed_at > c.completed_at and x.status <> 'rejected'
  );

  if p_status = 'rejected' then
    update public.task_completions set status = 'rejected' where id = c.id;

    if is_latest then
      update public.tasks
      set next_due_on = c.due_on,
          archived_at = case when recurrence_type = 'job' and not job_repeats
                             then null else archived_at end
      where id = c.task_id;
    end if;
  else
    update public.task_completions set status = 'approved' where id = c.id;

    if is_latest then
      update public.tasks t
      set next_due_on = private.compute_next_due(t, c.completed_on),
          archived_at = case when t.recurrence_type = 'job' and not t.job_repeats
                               and t.archived_at is null
                             then now() else t.archived_at end
      where t.id = c.task_id;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_completion og reassign_completion: uten sperren reward_already_paid. Ellers uendret.
-- ---------------------------------------------------------------------------
create or replace function public.remove_completion(p_completion_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c public.task_completions;
begin
  c := private.lock_today_completion(p_completion_id, null);

  delete from public.task_completions where id = c.id;

  if not exists (
    select 1 from public.task_completions x
    where x.task_id = c.task_id and x.completed_at > c.completed_at and x.status <> 'rejected'
  ) then
    update public.tasks
    set next_due_on = c.due_on,
        archived_at = case when recurrence_type = 'job' and not job_repeats
                           then null else archived_at end
    where id = c.task_id;
  end if;
end;
$$;

create or replace function public.reassign_completion(p_completion_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c      public.task_completions;
  t      public.tasks;
  doer   public.members;
begin
  c := private.lock_today_completion(p_completion_id, p_member_id);

  if c.completed_by_member_id = p_member_id then
    return;
  end if;

  select * into doer from public.members
  where id = p_member_id and household_id = c.household_id;
  if not found then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  select * into t from public.tasks where id = c.task_id;
  if t.recurrence_type = 'job' and not (
    doer.role = 'child'
    and (cardinality(t.job_member_ids) = 0 or doer.id = any (t.job_member_ids))
  ) then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  update public.task_completions
  set completed_by_member_id = doer.id,
      reward_nok  = case when doer.role = 'child' then coalesce(c.reward_nok, t.reward_nok) end,
      status      = 'approved',
      recorded_by = auth.uid()
  where id = c.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hjelperne for sperren brukes ikke lenger.
-- ---------------------------------------------------------------------------
drop function private.assert_reward_not_paid(public.task_completions);
drop function private.member_balance(uuid);
