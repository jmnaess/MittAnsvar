-- Steg 9: lønn per oppgave og jobbtavle (ledige jobber) for barn.
-- Se docs/DATABASE.md §1 (tasks, payouts, member_balances), §2 (job) og §3 (complete_task).
--
-- Hovedregler:
--   - Beløpet på oppgaven (tasks.reward_nok) kopieres til avkrysningen (task_completions.reward_nok).
--     Senere endring av prisen endrer derfor ikke det som allerede er tjent.
--   - Bare barn får lønn. Angring sletter avkrysningen, og beløpet forsvinner med den.
--   - Saldo = sum av beløp på avkrysninger − sum av utbetalinger. Lagres ikke, regnes i et view.
--   - Jobber (recurrence_type = 'job') har aldri frist: next_due_on er alltid null. Da er de
--     automatisk utenfor get_upcoming_occurrences og påminnelsene, og blir aldri forfalt.
--   - Engangsjobber arkiveres når de er gjort. Gjentakende jobber (job_repeats) blir stående.

-- ---------------------------------------------------------------------------
-- tasks: lønn og jobber
-- ---------------------------------------------------------------------------
alter table public.tasks
  -- Hele kroner. null = ingen lønn.
  add column reward_nok  integer check (reward_nok between 1 and 10000),
  -- Bare for jobber: false = engangsjobb (arkiveres når den er gjort), true = kan gjøres igjen.
  add column job_repeats boolean not null default false,
  add constraint tasks_job_repeats_valid check (not job_repeats or recurrence_type = 'job');

-- Samme som før, med en gren for job (ingen gjentakelseskolonner, som once).
alter table public.tasks drop constraint tasks_recurrence_valid;
alter table public.tasks add constraint tasks_recurrence_valid check (
  case recurrence_type
    when 'once' then
      recurrence_unit is null and recurrence_every is null
      and weekdays is null and month_day is null and month is null
    when 'job' then
      recurrence_unit is null and recurrence_every is null
      and weekdays is null and month_day is null and month is null
    when 'interval' then
      recurrence_unit is not null and recurrence_every is not null
      and weekdays is null and month_day is null and month is null
    when 'calendar' then
      recurrence_every is not null and
      case recurrence_unit
        when 'day'   then weekdays is null and month_day is null and month is null
        when 'week'  then weekdays is not null and month_day is null and month is null
        when 'month' then month_day is not null and weekdays is null and month is null
        when 'year'  then month is not null and weekdays is null
        else false
      end
    else false
  end
);

-- Klienten kan sette beløp og jobbtype. RLS på tasks gjør at bare voksne kan skrive.
grant insert (reward_nok, job_repeats) on public.tasks to authenticated;
grant update (reward_nok, job_repeats) on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Gjentakelse: jobber har ingen frist
-- ---------------------------------------------------------------------------
create or replace function private.first_due(t public.tasks)
returns date
language sql immutable set search_path = ''
as $$
  select case
    when t.recurrence_type = 'job' then null
    when private.is_month_task(t) then
      private.next_occurrence(t, make_date(extract(year from t.anchor_on)::int,
                                           extract(month from t.anchor_on)::int, 1) - 1)
    when t.recurrence_type = 'calendar' then private.next_occurrence(t, t.anchor_on - 1)
    else t.anchor_on
  end;
$$;

create or replace function private.compute_next_due(t public.tasks, completed_on date)
returns date
language plpgsql immutable set search_path = ''
as $$
begin
  case t.recurrence_type
    when 'once', 'job' then
      return null;
    when 'interval' then
      return (completed_on + case t.recurrence_unit
        when 'day'   then make_interval(days   => t.recurrence_every)
        when 'week'  then make_interval(weeks  => t.recurrence_every)
        when 'month' then make_interval(months => t.recurrence_every)
        when 'year'  then make_interval(years  => t.recurrence_every)
      end)::date;
    when 'calendar' then
      return private.next_occurrence(t, greatest(t.next_due_on, completed_on));
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- today_tasks: nå også med ledige jobber
-- Må lages på nytt fordi t.* har fått nye kolonner. En jobb er aldri forfalt.
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

-- ---------------------------------------------------------------------------
-- task_completions: beløpet som ble tjent
-- ---------------------------------------------------------------------------
alter table public.task_completions
  -- Kopiert fra tasks.reward_nok ved avkrysning. null = ingen lønn (eller en voksen gjorde det).
  add column reward_nok integer check (reward_nok > 0);

-- ---------------------------------------------------------------------------
-- Utbetalinger
-- ---------------------------------------------------------------------------
create table public.payouts (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references public.households (id) on delete cascade,
  -- Barnet som fikk pengene. Slettes med barneprofilen (GDPR), som avkrysningene.
  member_id             uuid not null,
  amount_nok            integer not null check (amount_nok > 0),
  paid_at               timestamptz not null default now(),
  -- Den voksne som registrerte utbetalingen.
  recorded_by_member_id uuid references public.members (id) on delete set null,

  constraint payouts_member_fk
    foreign key (household_id, member_id)
    references public.members (household_id, id) on delete cascade
);

create index payouts_member_idx on public.payouts (household_id, member_id, paid_at desc);

revoke all on public.payouts from anon, authenticated;
grant select on public.payouts to authenticated;
-- Ingen insert/update/delete: skjer via record_payout.

alter table public.payouts enable row level security;

create policy payouts_select on public.payouts
  for select to authenticated
  using (household_id in (select private.my_household_ids()));

-- ---------------------------------------------------------------------------
-- Saldo per barn
-- security_invoker: RLS på members, task_completions og payouts gjelder.
-- ---------------------------------------------------------------------------
create view public.member_balances
with (security_invoker = true)
as
select m.id           as member_id,
       m.household_id,
       e.earned_nok,
       p.paid_nok,
       e.earned_nok - p.paid_nok as balance_nok
from public.members m
cross join lateral (
  select coalesce(sum(c.reward_nok), 0)::int as earned_nok
  from public.task_completions c
  where c.household_id = m.household_id and c.completed_by_member_id = m.id
) e
cross join lateral (
  select coalesce(sum(x.amount_nok), 0)::int as paid_nok
  from public.payouts x
  where x.household_id = m.household_id and x.member_id = m.id
) p
where m.role = 'child';

revoke all on public.member_balances from anon, authenticated;
grant select on public.member_balances to authenticated;

-- ---------------------------------------------------------------------------
-- complete_task: lagrer beløpet og arkiverer engangsjobber
-- Returtypen får en ny kolonne (reward_nok), så funksjonen må droppes og lages på nytt.
--
-- Feil (errcode P0001): task_not_found, subscription_required, invalid_member (som før).
-- ---------------------------------------------------------------------------
drop function public.complete_task(uuid, uuid);

create function public.complete_task(p_task_id uuid, p_member_id uuid)
returns table (completion_id uuid, feedback_text text, next_due_on date, reward_nok integer)
language plpgsql
security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  t        public.tasks;
  caller   public.members;
  doer     public.members;
  hh_tone  public.feedback_tone;
  today    date;
  new_due  date;
  fb_id    uuid;
  fb_text  text;
  new_id   uuid;
  reward   integer;
begin
  -- Låser oppgaveraden: to samtidige avkrysninger av samme oppgave venter på hverandre,
  -- så den andre ser fristen (eller arkiveringen) den første satte.
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

  select feedback_tone into hh_tone from public.households where id = t.household_id;
  today   := private.household_today(t.household_id);
  new_due := private.compute_next_due(t, today);
  -- Bare barn får lønn. Beløpet kopieres, så senere endring av prisen ikke påvirker det.
  reward  := case when doer.role = 'child' then t.reward_nok end;

  -- Tilbakemelding: uendret fra steg 5 (se DATABASE.md §4).
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
     completed_on, completed_at, due_on, feedback_message_id, reward_nok)
  values
    (t.household_id, t.id, doer.id, auth.uid(),
     today, clock_timestamp(), t.next_due_on, fb_id, reward)
  returning id into new_id;

  update public.tasks
  set next_due_on = new_due,
      -- Engangsjobb: ferdig når den er gjort.
      archived_at = case when t.recurrence_type = 'job' and not t.job_repeats
                         then now() else archived_at end
  where id = t.id;

  return query select new_id, fb_text, new_due, reward;
end;
$$;

-- ---------------------------------------------------------------------------
-- undo_completion: henter også tilbake en engangsjobb
-- Ellers uendret (bare siste avkrysning, innen 10 minutter, voksen eller den som registrerte).
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

  -- Lås oppgaven, så ingen krysser av samtidig mens vi sjekker «siste».
  perform 1 from public.tasks where id = c.task_id for update;

  if exists (
    select 1 from public.task_completions x
    where x.task_id = c.task_id and x.completed_at > c.completed_at
  ) then
    raise exception 'undo_not_allowed' using errcode = 'P0001';
  end if;

  if c.completed_at < now() - interval '10 minutes' then
    raise exception 'undo_expired' using errcode = 'P0001';
  end if;

  delete from public.task_completions where id = c.id;
  update public.tasks
  set next_due_on = c.due_on,
      -- Engangsjobben ble arkivert av complete_task. Angring legger den tilbake på tavla.
      archived_at = case when recurrence_type = 'job' and not job_repeats
                         then null else archived_at end
  where id = c.task_id;
end;
$$;

revoke execute on function public.complete_task(uuid, uuid) from public, anon;
grant execute on function public.complete_task(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- record_payout: en voksen registrerer at et barn har fått pengene sine
--
-- Feil (errcode P0001):
--   not_adult              kalleren er ikke voksen i barnets husstand (også annen husstand)
--   invalid_member         medlemmet finnes ikke eller er ikke et barn
--   subscription_required  prøvetiden er over og det finnes ikke abonnement
--   amount_exceeds_balance beløpet er under 1 eller større enn saldoen
-- ---------------------------------------------------------------------------
create function public.record_payout(p_member_id uuid, p_amount_nok integer)
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
  -- Låser barnets rad: to samtidige utbetalinger venter på hverandre, så saldoen sjekkes riktig.
  select * into child from public.members where id = p_member_id for update;

  -- Kalleren må være voksen i SAMME husstand. Sjekkes før barnet, så en annen husstand
  -- ikke kan finne ut om en id finnes.
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
                   where c.completed_by_member_id = child.id), 0)
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

revoke execute on function public.record_payout(uuid, integer) from public, anon;
grant execute on function public.record_payout(uuid, integer) to authenticated;
