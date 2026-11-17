-- Steg 8: fremtidige forekomster, til påminnelser (og senere årshjulet, steg 10).
-- Se docs/DATABASE.md §2.
--
-- Gir én rad per forekomst i [p_from, p_to] for hver aktiv oppgave. Starter på next_due_on og
-- kaller compute_next_due gjentatte ganger, som om hver forekomst blir utført på fristen.
-- Regelen for gjentakelse finnes dermed fortsatt bare ett sted.
--
-- Forfalte kalenderoppgaver spoles fram til første forekomst fra og med p_from. Den forfalte
-- forekomsten selv er ikke med (den ligger før vinduet).
--
-- Ingen filter på enhet: påminnelser trenger daglige og ukentlige oppgaver. Årshjulet filtrerer selv.
-- security invoker: RLS på tasks gjelder, så funksjonen trenger ingen egne tilgangssjekker.

create function public.get_upcoming_occurrences(p_household_id uuid, p_from date, p_to date)
returns table (task_id uuid, due_on date)
language plpgsql stable security invoker set search_path = ''
as $$
declare
  t public.tasks;
  d date;
begin
  -- Maks ett år. Det holder løkkene korte også for daglige oppgaver.
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'invalid_window' using errcode = '22023';
  end if;

  for t in
    select * from public.tasks
    where household_id = p_household_id
      and archived_at is null
      and next_due_on is not null
  loop
    d := t.next_due_on;
    if d < p_from and t.recurrence_type = 'calendar' then
      d := private.next_occurrence(t, p_from - 1);
    end if;

    -- compute_next_due gir alltid en senere dato (eller null for engangsoppgaver),
    -- så løkken stopper.
    while d is not null and d <= p_to loop
      if d >= p_from then
        task_id := t.id;
        due_on := d;
        return next;
      end if;
      t.next_due_on := d;
      d := private.compute_next_due(t, d);
    end loop;
  end loop;
end;
$$;

revoke execute on function public.get_upcoming_occurrences(uuid, date, date) from public, anon;
grant execute on function public.get_upcoming_occurrences(uuid, date, date) to authenticated;
