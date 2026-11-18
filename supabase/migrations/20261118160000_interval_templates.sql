-- Intervallmaler (hjemprofil): første frist ett intervall frem.
-- Se docs/DATABASE.md §2 (første frist) og §4 (aktivering).
--
-- En intervalloppgave som lages fra en mal (activate_templates, template_id satt), får første frist
-- ett intervall etter i dag: «hver 8. uke etter sist utført» forfaller om 8 uker, ikke i dag.
-- Egne intervalloppgaver er uendret (første frist i dag). Det samme gjelder alle andre typer.
--
-- Bare INSERT endres. Endrer brukeren gjentakelsen senere, starter oppgaven på nytt fra i dag,
-- som for alle andre oppgaver.

-- Ellers uendret fra 20261118130000_postpone_task.sql.
create or replace function private.tasks_set_defaults()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.anchor_on  := private.household_today(new.household_id);
    new.created_by := private.my_member_id(new.household_id);
    new.once_on    := case when new.once_on < new.anchor_on then new.anchor_on else new.once_on end;
    new.next_due_on := case
      when new.template_id is not null and new.recurrence_type = 'interval'
        then private.compute_next_due(new, new.anchor_on)
      else private.first_due(new)
    end;
    new.postponed_from := null;
    new.postponed_to   := null;
  elsif (new.recurrence_type, new.recurrence_unit, new.recurrence_every,
         new.weekdays, new.month_day, new.month, new.once_on)
        is distinct from
        (old.recurrence_type, old.recurrence_unit, old.recurrence_every,
         old.weekdays, old.month_day, old.month, old.once_on) then
    -- Ny gjentakelse eller ny dato: start på nytt fra i dag.
    new.anchor_on   := private.household_today(new.household_id);
    new.once_on     := case when new.once_on < new.anchor_on then new.anchor_on else new.once_on end;
    new.next_due_on := private.first_due(new);
    if new.postponed_to is not distinct from old.postponed_to then
      new.postponed_from := null;
      new.postponed_to   := null;
    end if;
  end if;
  return new;
end;
$$;
