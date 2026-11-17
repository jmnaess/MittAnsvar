-- Steg 10b: godkjenning av lønn. Se docs/ARCHITECTURE.md §10 og docs/DATABASE.md §1, §3 og §5.
--
-- Hovedregler:
--   - Hver avkrysning har en tilstand (status): pending (venter), approved (godkjent) eller
--     rejected (ikke godkjent).
--   - Et barn som krysser av en oppgave med lønn på sin egen enhet, får pending. Alt annet
--     (uten lønn, eller registrert av en voksen) er approved med én gang.
--   - En voksen godkjenner eller avviser. «Ikke godkjent» betyr at oppgaven ikke er gjort:
--     beløpet teller ikke, og er det den siste avkrysningen, settes fristen tilbake og en
--     engangsjobb blir ledig igjen (samme som angring). Raden beholdes, så barnet ser at den
--     ikke ble godkjent.
--   - Saldo: godkjent − utbetalt kan betales ut. Det som venter, vises ved siden av.
--
-- task_completions er ikke lenger helt append-only: bare status kan endres, og bare av
-- approve_completions og reject_completion.
--
-- Feil (errcode P0001, nøkkel som melding, se src/lib/errors.ts):
--   approve_completions, reject_completion: not_adult, subscription_required
--   reject_completion:                      not_pending (allerede godkjent eller avvist)
--   undo_completion:                        undo_not_allowed også for en avvist avkrysning

-- ---------------------------------------------------------------------------
-- Tilstand på avkrysningen
-- ---------------------------------------------------------------------------
create type public.completion_status as enum ('pending', 'approved', 'rejected');

alter table public.task_completions
  -- Eksisterende rader er godkjent: de ble registrert før godkjenning fantes.
  add column status public.completion_status not null default 'approved';

-- «Til godkjenning» i «I dag» henter bare ventende rader.
create index task_completions_pending_idx on public.task_completions (household_id)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- complete_task: setter status. Returtypen får en ny kolonne, så funksjonen lages på nytt.
-- Ellers uendret fra 20261117190000_child_devices.sql.
-- ---------------------------------------------------------------------------
drop function public.complete_task(uuid, uuid);

create function public.complete_task(p_task_id uuid, p_member_id uuid)
returns table (completion_id uuid, feedback_text text, next_due_on date, reward_nok integer,
               status public.completion_status)
language plpgsql
security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  t          public.tasks;
  caller     public.members;
  doer       public.members;
  hh_tone    public.feedback_tone;
  today      date;
  new_due    date;
  fb_id      uuid;
  fb_text    text;
  new_id     uuid;
  reward     integer;
  new_status public.completion_status;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found or t.archived_at is not null then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  select * into caller from public.members
  where household_id = t.household_id and auth_user_id = auth.uid();
  if not found then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  if not private.household_has_access(t.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  select * into doer from public.members
  where id = p_member_id and household_id = t.household_id;
  if not found or (caller.role = 'child' and doer.id <> caller.id) then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  if caller.role = 'child' and not (
    case when t.recurrence_type = 'job'
      then cardinality(t.job_member_ids) = 0 or caller.id = any (t.job_member_ids)
      else t.assigned_member_id is null or t.assigned_member_id = caller.id
    end
  ) then
    raise exception 'invalid_member' using errcode = 'P0001';
  end if;

  select feedback_tone into hh_tone from public.households where id = t.household_id;
  today   := private.household_today(t.household_id);
  new_due := private.compute_next_due(t, today);
  reward  := case when doer.role = 'child' then t.reward_nok end;
  -- Steg 10b: et barn som gir seg selv lønn, må få det godkjent. Det en voksen registrerer
  -- (også for et barn), og alt uten lønn, er godkjent med én gang.
  new_status := case when reward is not null and caller.role = 'child'
                     then 'pending' else 'approved' end;

  select m.id, m.text into fb_id, fb_text
  from public.feedback_messages m
  where m.is_active
    and (hh_tone = 'both' or m.tone = hh_tone::text)
    and m.audience in ('any', doer.role::text::public.audience)
    and (m.category is null or m.category = t.category)
  order by
    m.id in (
      select c.feedback_message_id
      from public.task_completions c
      where c.household_id = t.household_id and c.feedback_message_id is not null
      order by c.completed_at desc
      limit 20
    ),
    m.category is null,
    random()
  limit 1;

  insert into public.task_completions
    (household_id, task_id, completed_by_member_id, recorded_by,
     completed_on, completed_at, due_on, feedback_message_id, reward_nok, status)
  values
    (t.household_id, t.id, doer.id, auth.uid(),
     today, clock_timestamp(), t.next_due_on, fb_id, reward, new_status)
  returning id into new_id;

  update public.tasks
  set next_due_on = new_due,
      archived_at = case when t.recurrence_type = 'job' and not t.job_repeats
                         then now() else archived_at end
  where id = t.id;

  return query select new_id, fb_text, new_due, reward, new_status;
end;
$$;

revoke execute on function public.complete_task(uuid, uuid) from public, anon;
grant  execute on function public.complete_task(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- undo_completion: en avvist avkrysning kan ikke angres (oppgaven er allerede «ikke gjort»),
-- og avviste rader teller ikke når vi sjekker om dette er den siste avkrysningen.
-- Ellers uendret fra 20261117170100_rewards_and_jobs.sql.
-- ---------------------------------------------------------------------------
create or replace function public.undo_completion(p_completion_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c      public.task_completions;
  caller public.members;
begin
  select * into c from public.task_completions where id = p_completion_id;
  if not found then
    raise exception 'completion_not_found' using errcode = 'P0001';
  end if;

  select * into caller from public.members
  where household_id = c.household_id and auth_user_id = auth.uid();
  if not found then
    raise exception 'completion_not_found' using errcode = 'P0001';
  end if;

  if caller.role <> 'adult' and c.recorded_by is distinct from auth.uid() then
    raise exception 'undo_not_allowed' using errcode = 'P0001';
  end if;

  if c.status = 'rejected' then
    raise exception 'undo_not_allowed' using errcode = 'P0001';
  end if;

  perform 1 from public.tasks where id = c.task_id for update;

  if exists (
    select 1 from public.task_completions x
    where x.task_id = c.task_id and x.completed_at > c.completed_at and x.status <> 'rejected'
  ) then
    raise exception 'undo_not_allowed' using errcode = 'P0001';
  end if;

  if c.completed_at < now() - interval '10 minutes' then
    raise exception 'undo_expired' using errcode = 'P0001';
  end if;

  delete from public.task_completions where id = c.id;
  update public.tasks
  set next_due_on = c.due_on,
      archived_at = case when recurrence_type = 'job' and not job_repeats
                         then null else archived_at end
  where id = c.task_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hjelper: kalleren er voksen i husstanden til ALLE avkrysningene, og alle finnes.
-- Ukjente id-er og andre husstander gir samme svar, så ingen kan finne ut om en id finnes.
-- ---------------------------------------------------------------------------
create function private.assert_adult_for_completions(p_ids uuid[])
returns void
language plpgsql stable security definer set search_path = ''
as $$
declare
  found_count int;
begin
  select count(*) into found_count
  from public.task_completions c
  where c.id = any (p_ids) and private.is_adult(c.household_id);

  if found_count <> (select count(distinct x) from unnest(p_ids) as x) then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.task_completions c
    where c.id = any (p_ids) and not private.household_has_access(c.household_id)
  ) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function private.assert_adult_for_completions(uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- approve_completions: en voksen godkjenner én eller flere (også «Godkjenn alle»).
-- Bare ventende rader endres. Allerede godkjente eller avviste hoppes over, så det er trygt
-- å trykke to ganger. Returnerer antall som ble godkjent.
-- ---------------------------------------------------------------------------
create function public.approve_completions(p_completion_ids uuid[])
returns int
language plpgsql
security definer set search_path = ''
as $$
declare
  n int;
begin
  if coalesce(cardinality(p_completion_ids), 0) = 0 then
    return 0;
  end if;

  perform private.assert_adult_for_completions(p_completion_ids);

  update public.task_completions
  set status = 'approved'
  where id = any (p_completion_ids) and status = 'pending';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- reject_completion: «Ikke godkjent». Beløpet teller ikke lenger, og oppgaven regnes som ikke
-- gjort. Er dette den siste (ikke avviste) avkrysningen på oppgaven, settes fristen tilbake,
-- og en engangsjobb legges tilbake på tavla. Finnes en nyere avkrysning (f.eks. en gjentakende
-- jobb gjort to ganger), endres bare statusen.
-- ---------------------------------------------------------------------------
create function public.reject_completion(p_completion_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c public.task_completions;
begin
  perform private.assert_adult_for_completions(array[p_completion_id]);

  select * into c from public.task_completions where id = p_completion_id;

  -- Lås oppgaven, så ingen krysser av samtidig mens vi sjekker «siste».
  perform 1 from public.tasks where id = c.task_id for update;
  -- Les raden på nytt etter låsen: en annen voksen kan ha godkjent den i mellomtiden.
  select * into c from public.task_completions where id = p_completion_id for update;

  if c.status <> 'pending' then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;

  update public.task_completions set status = 'rejected' where id = c.id;

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

revoke execute on function public.approve_completions(uuid[]) from public, anon;
grant  execute on function public.approve_completions(uuid[]) to authenticated;
revoke execute on function public.reject_completion(uuid)     from public, anon;
grant  execute on function public.reject_completion(uuid)     to authenticated;

-- ---------------------------------------------------------------------------
-- member_balances: earned_nok er nå bare godkjent, og pending_nok er det som venter.
-- balance_nok = godkjent − utbetalt (det som kan betales ut). Appen viser balance + pending.
-- pending_nok legges til sist, så viewet kan erstattes uten å droppes.
-- ---------------------------------------------------------------------------
create or replace view public.member_balances
with (security_invoker = true)
as
select m.id           as member_id,
       m.household_id,
       e.earned_nok,
       p.paid_nok,
       e.earned_nok - p.paid_nok as balance_nok,
       e.pending_nok
from public.members m
cross join lateral (
  select coalesce(sum(c.reward_nok) filter (where c.status = 'approved'), 0)::int as earned_nok,
         coalesce(sum(c.reward_nok) filter (where c.status = 'pending'), 0)::int  as pending_nok
  from public.task_completions c
  where c.household_id = m.household_id and c.completed_by_member_id = m.id
) e
cross join lateral (
  select coalesce(sum(x.amount_nok), 0)::int as paid_nok
  from public.payouts x
  where x.household_id = m.household_id and x.member_id = m.id
) p
where m.role = 'child'
  and (private.is_adult(m.household_id) or m.auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- record_payout: bare godkjent beløp kan betales ut. Ellers uendret.
-- ---------------------------------------------------------------------------
create or replace function public.record_payout(p_member_id uuid, p_amount_nok integer)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  child   public.members;
  caller  public.members;
  balance integer;
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

  select coalesce((select sum(c.reward_nok) from public.task_completions c
                   where c.completed_by_member_id = child.id and c.status = 'approved'), 0)
       - coalesce((select sum(x.amount_nok) from public.payouts x
                   where x.member_id = child.id), 0)
  into balance;

  if p_amount_nok is null or p_amount_nok < 1 or p_amount_nok > balance then
    raise exception 'amount_exceeds_balance' using errcode = 'P0001';
  end if;

  insert into public.payouts (household_id, member_id, amount_nok, recorded_by_member_id)
  values (child.household_id, child.id, p_amount_nok, caller.id)
  returning id into new_id;

  return new_id;
end;
$$;
