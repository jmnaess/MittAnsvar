-- Endre godkjenning i ettertid. Se docs/DATABASE.md §3 og §5.
--
-- En voksen kan trykke på en avkrysning med lønn i barnets historikk og bytte mellom
-- godkjent og ikke godkjent. Ventende avkrysninger håndteres som før (approve_completions
-- og reject_completion).
--
--   godkjent → ikke godkjent: samme regler som reject_completion. Avvises hvis saldoen ville
--     blitt negativ fordi beløpet allerede er betalt ut.
--   ikke godkjent → godkjent: beløpet teller igjen. Er dette fortsatt den siste (ikke avviste)
--     avkrysningen, flyttes fristen fram som ved vanlig avkrysning (regnet fra dagen oppgaven
--     ble gjort), og en engangsjobb som fortsatt er ledig, arkiveres igjen. Er oppgaven gjort
--     på nytt siden, endres bare statusen.
--
-- Feil (errcode P0001, nøkkel som melding, se src/lib/errors.ts):
--   not_adult, subscription_required (fra private.assert_adult_for_completions)
--   status_not_changeable: venter, har ingen lønn, har allerede denne statusen, eller p_status
--                          er pending
--   reward_already_paid:   beløpet er betalt ut, så det kan ikke trekkes tilbake

create function public.set_completion_status(p_completion_id uuid,
                                             p_status public.completion_status)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c         public.task_completions;
  is_latest boolean;
  balance   integer;
begin
  perform private.assert_adult_for_completions(array[p_completion_id]);

  select * into c from public.task_completions where id = p_completion_id;

  -- Lås oppgaven (ingen krysser av samtidig mens vi sjekker «siste») og barnet (ingen
  -- utbetaling samtidig mens vi sjekker saldoen). Samme rekkefølge som ellers: oppgave først.
  perform 1 from public.tasks where id = c.task_id for update;
  perform 1 from public.members where id = c.completed_by_member_id for update;
  -- Les raden på nytt etter låsene: en annen voksen kan ha endret den i mellomtiden.
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
    select coalesce((select sum(x.reward_nok) from public.task_completions x
                     where x.completed_by_member_id = c.completed_by_member_id
                       and x.status = 'approved'), 0)
         - coalesce((select sum(p.amount_nok) from public.payouts p
                     where p.member_id = c.completed_by_member_id), 0)
    into balance;

    if balance - c.reward_nok < 0 then
      raise exception 'reward_already_paid' using errcode = 'P0001';
    end if;

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

revoke execute on function public.set_completion_status(uuid, public.completion_status) from public, anon;
grant  execute on function public.set_completion_status(uuid, public.completion_status) to authenticated;
