-- «Utsett til» også for nærmeste kommende forekomst («Kommende» i personvisningen).
-- Se docs/DATABASE.md §2 (Utsettelse) og §5.
--
-- Før kunne bare oppgaver i «I dag» utsettes. Nå kan alle med en åpen frist utsettes, også en
-- som allerede er utsatt. Ny dato må være etter både i dag og fristen, ellers er det ingen
-- utsettelse. postponed_from er alltid forrige frist, så «Angre» går ett steg tilbake.
-- undo_postpone, complete_task og viewene er uendret.
--
-- Feil: not_postponable (jobb eller utført engangsoppgave), invalid_date (ikke etter i dag og
-- fristen, eller mer enn ett år fram), ellers som før.

create or replace function public.postpone_task(p_task_id uuid, p_to date)
returns date
language plpgsql
security definer set search_path = ''
as $$
declare
  t     public.tasks;
  today date;
begin
  t := private.lock_task_for_adult(p_task_id);
  today := private.household_today(t.household_id);

  if t.recurrence_type = 'job' or t.next_due_on is null then
    raise exception 'not_postponable' using errcode = 'P0001';
  end if;
  if p_to is null or p_to <= greatest(today, t.next_due_on) or p_to > today + 366 then
    raise exception 'invalid_date' using errcode = 'P0001';
  end if;

  if t.recurrence_type = 'once' then
    -- Triggeren gir next_due_on = once_on.
    update public.tasks
    set once_on = p_to, postponed_from = t.next_due_on, postponed_to = p_to
    where id = t.id;
  else
    update public.tasks
    set next_due_on = p_to, postponed_from = t.next_due_on, postponed_to = p_to
    where id = t.id;
  end if;

  return t.next_due_on;
end;
$$;
