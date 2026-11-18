-- Engangsoppgaver med valgfri dato («I dag», «I morgen», «Velg dato»). Se docs/DATABASE.md §1 og §2.
--
-- - once_on: datoen en engangsoppgave skal gjøres. null = i dag (husstandens tidssone), slik
--   engangsoppgaver alltid har vært. Klienten kan skrive den. next_due_on settes fortsatt bare
--   av databasen.
-- - Bare for recurrence_type = 'once'.
-- - En dato før i dag flyttes til i dag. Mobilen og husstanden kan være på hver sin side av
--   midnatt, og datovelgeren tillater uansett ikke datoer bakover.
-- - Ny frist bare når once_on (eller gjentakelsen) endres. Endres bare tittelen, står fristen,
--   også for en engangsoppgave som er gjort (next_due_on = null).

alter table public.tasks
  add column once_on date,
  add constraint tasks_once_on_only_once check (once_on is null or recurrence_type = 'once');

grant insert (once_on) on public.tasks to authenticated;
grant update (once_on) on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- first_due: engangsoppgaver får once_on, ellers i dag. Ellers uendret fra
-- 20261117170100_rewards_and_jobs.sql.
-- ---------------------------------------------------------------------------
create or replace function private.first_due(t public.tasks)
returns date
language sql immutable set search_path = ''
as $$
  select case
    when t.recurrence_type = 'job' then null
    when t.recurrence_type = 'once' then coalesce(t.once_on, t.anchor_on)
    when private.is_month_task(t) then
      private.next_occurrence(t, make_date(extract(year from t.anchor_on)::int,
                                           extract(month from t.anchor_on)::int, 1) - 1)
    when t.recurrence_type = 'calendar' then private.next_occurrence(t, t.anchor_on - 1)
    else t.anchor_on
  end;
$$;

-- ---------------------------------------------------------------------------
-- Triggeren: once_on gir ny frist når den endres, og flyttes til i dag hvis den er passert.
-- Ellers uendret fra 20261117074347_tasks.sql.
-- ---------------------------------------------------------------------------
create or replace function private.tasks_set_defaults()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.anchor_on  := private.household_today(new.household_id);
    new.created_by := private.my_member_id(new.household_id);
    new.once_on    := case when new.once_on < new.anchor_on then new.anchor_on else new.once_on end;
    new.next_due_on := private.first_due(new);
  elsif (new.recurrence_type, new.recurrence_unit, new.recurrence_every,
         new.weekdays, new.month_day, new.month, new.once_on)
        is distinct from
        (old.recurrence_type, old.recurrence_unit, old.recurrence_every,
         old.weekdays, old.month_day, old.month, old.once_on) then
    -- Ny gjentakelse eller ny dato: start på nytt fra i dag.
    new.anchor_on   := private.household_today(new.household_id);
    new.once_on     := case when new.once_on < new.anchor_on then new.anchor_on else new.once_on end;
    new.next_due_on := private.first_due(new);
  end if;
  return new;
end;
$$;
