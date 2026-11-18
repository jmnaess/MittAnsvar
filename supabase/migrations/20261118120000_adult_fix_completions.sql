-- Voksne retter feil i «I dag» hele dagen. Se docs/DATABASE.md §3.
--
-- undo_completion har en grense på 10 minutter. En voksen trenger å rette feil senere samme dag:
--   remove_completion:   «Ikke gjort». Avkrysningen slettes, som ved angring.
--   reassign_completion: «Endre hvem som gjorde det». Avkrysningen flyttes til en annen person.
--
-- Felles regler:
--   - Bare voksne i husstanden, med abonnement (private.assert_adult_for_completions).
--   - Bare avkrysninger fra i dag i husstandens tidssone. Eldre endres fra historikken.
--   - Avviste rader vises ikke i «I dag» og kan ikke endres her.
--   - Låser oppgaven, så de berørte barnas members-rader (sortert, så to voksne ikke låser i
--     motsatt rekkefølge), så raden. Samme rekkefølge som set_completion_status.
--   - Saldoen kan ikke bli negativ: er et godkjent beløp allerede betalt ut, avvises endringen.
--
-- Feil (errcode P0001, nøkkel som melding, se src/lib/errors.ts):
--   not_adult, subscription_required (fra private.assert_adult_for_completions)
--   completion_not_found: slettet i mellomtiden, eller avvist
--   not_today:            ikke gjort i dag
--   reward_already_paid:  beløpet er betalt ut, så det kan ikke trekkes tilbake
--   invalid_member:       (reassign) personen finnes ikke i husstanden, eller jobben gjelder
--                         ikke personen

-- ---------------------------------------------------------------------------
-- Hjelper: godkjent − utbetalt for ett medlem. Samme regnestykke som record_payout.
-- ---------------------------------------------------------------------------
create function private.member_balance(p_member_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select (coalesce((select sum(c.reward_nok) from public.task_completions c
                    where c.completed_by_member_id = p_member_id and c.status = 'approved'), 0)
        - coalesce((select sum(p.amount_nok) from public.payouts p
                    where p.member_id = p_member_id), 0))::integer
$$;

revoke execute on function private.member_balance(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Hjelper: sjekker og låser for begge RPC-ene. Returnerer raden, lest på nytt etter låsene.
-- p_other_member_id: personen avkrysningen flyttes til (null ved fjerning).
-- ---------------------------------------------------------------------------
create function private.lock_today_completion(p_completion_id uuid, p_other_member_id uuid)
returns public.task_completions
language plpgsql security definer set search_path = ''
as $$
declare
  c public.task_completions;
begin
  perform private.assert_adult_for_completions(array[p_completion_id]);

  select * into c from public.task_completions where id = p_completion_id;

  perform 1 from public.tasks where id = c.task_id for update;
  -- Bare barn har saldo, men å låse en voksens rad er ufarlig og gjør koden enklere.
  perform 1 from public.members
  where id in (c.completed_by_member_id, p_other_member_id) and household_id = c.household_id
  order by id
  for update;

  select * into c from public.task_completions where id = p_completion_id for update;
  if not found or c.status = 'rejected' then
    raise exception 'completion_not_found' using errcode = 'P0001';
  end if;

  if c.completed_on <> private.household_today(c.household_id) then
    raise exception 'not_today' using errcode = 'P0001';
  end if;

  return c;
end;
$$;

revoke execute on function private.lock_today_completion(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Hjelper: et godkjent beløp kan ikke trekkes tilbake hvis det allerede er betalt ut.
-- ---------------------------------------------------------------------------
create function private.assert_reward_not_paid(c public.task_completions)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if c.status = 'approved' and c.reward_nok is not null
     and private.member_balance(c.completed_by_member_id) - c.reward_nok < 0 then
    raise exception 'reward_already_paid' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function private.assert_reward_not_paid(public.task_completions) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- remove_completion: «Ikke gjort». Som undo_completion, men uten tidsgrense, og også når det
-- ikke er den siste avkrysningen. Er den siste, settes fristen tilbake og en engangsjobb blir
-- ledig igjen. Ellers slettes bare raden.
-- ---------------------------------------------------------------------------
create function public.remove_completion(p_completion_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c public.task_completions;
begin
  c := private.lock_today_completion(p_completion_id, null);
  perform private.assert_reward_not_paid(c);

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

-- ---------------------------------------------------------------------------
-- reassign_completion: «Endre hvem som gjorde det». Oppgaven er fortsatt gjort, så fristen
-- endres ikke. Lønn som når en voksen registrerer: et barn får beløpet godkjent med én gang,
-- en voksen får ingen lønn. Beløpet som ble lagret på avkrysningen beholdes. Bare hvis
-- avkrysningen ikke hadde beløp (en voksen gjorde den), brukes oppgavens nåværende pris.
-- Jobber kan bare flyttes til et barn jobben gjelder (tom liste = alle barna).
-- recorded_by blir den voksne, så det forrige barnet ikke kan angre den.
-- ---------------------------------------------------------------------------
create function public.reassign_completion(p_completion_id uuid, p_member_id uuid)
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

  perform private.assert_reward_not_paid(c);

  update public.task_completions
  set completed_by_member_id = doer.id,
      reward_nok  = case when doer.role = 'child' then coalesce(c.reward_nok, t.reward_nok) end,
      status      = 'approved',
      recorded_by = auth.uid()
  where id = c.id;
end;
$$;

revoke execute on function public.remove_completion(uuid)         from public, anon;
grant  execute on function public.remove_completion(uuid)         to authenticated;
revoke execute on function public.reassign_completion(uuid, uuid) from public, anon;
grant  execute on function public.reassign_completion(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- today_completions: job_member_ids, så appen vet hvem en jobb kan flyttes til.
-- Ny kolonne må stå sist i et «create or replace view». Ellers uendret.
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
       t.job_member_ids
from public.task_completions c
join public.tasks t on t.id = c.task_id
where c.completed_on = private.household_today(c.household_id)
  and c.status <> 'rejected';
