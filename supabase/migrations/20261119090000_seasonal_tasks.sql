-- Sesongoppgaver: en gjentakende oppgave kan begrenses til en del av året (aktiv periode).
-- Se docs/DATABASE.md §2 (Sesong).
--
-- Perioden er hele måneder: season_start_month – season_end_month. Start > slutt betyr over
-- nyttår (okt–apr). Start = slutt er én måned. Gjelder kalender (ikke årlig) og intervall.
--
-- Regler:
--   - Utenfor perioden finnes ingen forekomster. matches_pattern sjekker perioden, så kalender-
--     oppgaver følger med i next_occurrence, first_due, compute_next_due og get_upcoming_occurrences.
--   - Intervall: utført + intervall. Havner datoen utenfor perioden, blir fristen den 1. i
--     periodens første måned.
--   - Forfalt når perioden slutter: timesjobben roll_over_seasons flytter fristen til første
--     forekomst i neste periode. next_due_on er dermed alltid riktig lagret.
--   - Utsatt til en dato utenfor perioden: datoen respekteres (postpone_task er uendret). Blir den
--     ikke gjort, ruller jobben den dagen etter.

-- ---------------------------------------------------------------------------
-- Kolonner
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column season_start_month smallint check (season_start_month between 1 and 12),
  add column season_end_month   smallint check (season_end_month between 1 and 12),
  add constraint tasks_season_valid check (
    (season_start_month is null and season_end_month is null)
    or (season_start_month is not null and season_end_month is not null
        and (recurrence_type = 'interval'
             or (recurrence_type = 'calendar' and recurrence_unit is distinct from 'year')))
  );

alter table public.task_templates
  add column season_start_month smallint check (season_start_month between 1 and 12),
  add column season_end_month   smallint check (season_end_month between 1 and 12),
  add constraint task_templates_season_valid check (
    (season_start_month is null and season_end_month is null)
    or (season_start_month is not null and season_end_month is not null
        and (recurrence_type = 'interval'
             or (recurrence_type = 'calendar' and recurrence_unit is distinct from 'year')))
  );

grant insert (season_start_month, season_end_month) on public.tasks to authenticated;
grant update (season_start_month, season_end_month) on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Hjelpere for perioden
-- ---------------------------------------------------------------------------

-- Er d innenfor perioden? Alltid true uten periode.
create function private.in_season(t public.tasks, d date)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when t.season_start_month is null then true
    when t.season_start_month <= t.season_end_month then
      extract(month from d)::smallint between t.season_start_month and t.season_end_month
    else
      extract(month from d)::smallint >= t.season_start_month
      or extract(month from d)::smallint <= t.season_end_month
  end;
$$;

-- d hvis d er i perioden, ellers den 1. i periodens første måned etter d.
create function private.season_start_on_or_after(t public.tasks, d date)
returns date
language sql immutable set search_path = ''
as $$
  select case
    when private.in_season(t, d) then d
    else make_date(
      extract(year from d)::int
        + case when extract(month from d)::int < t.season_start_month then 0 else 1 end,
      t.season_start_month, 1)
  end;
$$;

-- Første dag etter d som er utenfor perioden (dagen etter at perioden slutter). null uten periode.
create function private.season_gap_after(t public.tasks, d date)
returns date
language sql immutable set search_path = ''
as $$
  select case
    when t.season_start_month is null then null
    when not private.in_season(t, d + 1) then d + 1
    -- d + 1 er i perioden: den 1. i måneden etter periodens siste måned.
    else (make_date(
      extract(year from d + 1)::int
        + case when extract(month from d + 1)::int <= t.season_end_month then 0 else 1 end,
      t.season_end_month, 1) + interval '1 month')::date
  end;
$$;

-- ---------------------------------------------------------------------------
-- Gjentakelse: som før, men med perioden
-- ---------------------------------------------------------------------------

-- Ellers uendret fra 20261117074347_tasks.sql.
create or replace function private.matches_pattern(t public.tasks, d date)
returns boolean
language sql immutable set search_path = ''
as $$
  select private.in_season(t, d) and case t.recurrence_unit
    when 'day' then
      (d - t.anchor_on) % t.recurrence_every = 0
    when 'week' then
      extract(isodow from d)::smallint = any (t.weekdays)
      and (
        ((d - (extract(isodow from d)::int - 1))
          - (t.anchor_on - (extract(isodow from t.anchor_on)::int - 1))) / 7
      ) % t.recurrence_every = 0
    when 'month' then
      extract(day from d)::smallint = least(t.month_day, private.last_day_of_month(d))
      and (
        (extract(year from d)::int * 12 + extract(month from d)::int)
        - (extract(year from t.anchor_on)::int * 12 + extract(month from t.anchor_on)::int)
      ) % t.recurrence_every = 0
    when 'year' then
      extract(month from d)::smallint = t.month
      and extract(day from d)::smallint
          = least(coalesce(t.month_day, 1::smallint), private.last_day_of_month(d))
      and (extract(year from d)::int - extract(year from t.anchor_on)::int) % t.recurrence_every = 0
    else false
  end;
$$;

-- Sperren mot evig løkke får ett år ekstra når oppgaven har periode (vinteren hoppes over).
-- Ellers uendret fra 20261117074347_tasks.sql.
create or replace function private.next_occurrence(t public.tasks, after date)
returns date
language plpgsql immutable set search_path = ''
as $$
declare
  d date := after;
  max_days int := (t.recurrence_every + 1) * case t.recurrence_unit
    when 'day' then 1 when 'week' then 7 when 'month' then 31 when 'year' then 366 end
    + case when t.season_start_month is null then 0 else 366 end;
begin
  if t.recurrence_every is null
     or t.recurrence_unit is null
     or (t.recurrence_unit = 'week' and t.weekdays is null)
     or (t.recurrence_unit = 'month' and t.month_day is null)
     or (t.recurrence_unit = 'year' and t.month is null)
     -- Ugyldig periode (bare én av kolonnene, eller årlig): check-constraint avviser raden.
     or ((t.season_start_month is null) <> (t.season_end_month is null))
     or (t.season_start_month is not null and t.recurrence_unit = 'year') then
    return null;
  end if;

  for i in 1 .. max_days loop
    d := d + 1;
    if private.matches_pattern(t, d) then
      return d;
    end if;
  end loop;
  raise exception 'recurrence_not_found' using errcode = 'P0001';
end;
$$;

-- Intervall: utført + intervall, flyttet til periodens start hvis datoen er utenfor.
-- Ellers uendret fra 20261117170100_rewards_and_jobs.sql.
create or replace function private.compute_next_due(t public.tasks, completed_on date)
returns date
language plpgsql immutable set search_path = ''
as $$
begin
  case t.recurrence_type
    when 'once', 'job' then
      return null;
    when 'interval' then
      return private.season_start_on_or_after(t, (completed_on + case t.recurrence_unit
        when 'day'   then make_interval(days   => t.recurrence_every)
        when 'week'  then make_interval(weeks  => t.recurrence_every)
        when 'month' then make_interval(months => t.recurrence_every)
        when 'year'  then make_interval(years  => t.recurrence_every)
      end)::date);
    when 'calendar' then
      return private.next_occurrence(t, greatest(t.next_due_on, completed_on));
  end case;
end;
$$;

-- Intervall: første frist er i dag, eller periodens start. Ellers uendret fra 20261118110000_once_on.sql.
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
    else private.season_start_on_or_after(t, t.anchor_on)
  end;
$$;

-- ---------------------------------------------------------------------------
-- Triggeren: ny periode = ny gjentakelse (start på nytt fra i dag).
-- Ellers uendret fra 20261118160000_interval_templates.sql.
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
    new.next_due_on := case
      when new.template_id is not null and new.recurrence_type = 'interval'
        then private.compute_next_due(new, new.anchor_on)
      else private.first_due(new)
    end;
    new.postponed_from := null;
    new.postponed_to   := null;
  elsif (new.recurrence_type, new.recurrence_unit, new.recurrence_every,
         new.weekdays, new.month_day, new.month, new.once_on,
         new.season_start_month, new.season_end_month)
        is distinct from
        (old.recurrence_type, old.recurrence_unit, old.recurrence_every,
         old.weekdays, old.month_day, old.month, old.once_on,
         old.season_start_month, old.season_end_month) then
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

-- ---------------------------------------------------------------------------
-- Forfalt når perioden slutter
-- ---------------------------------------------------------------------------

-- Neste frist når perioden er over: første forekomst fra og med i dag (som er utenfor perioden,
-- eller i en ny periode hvis jobben ikke har kjørt på lenge).
create function private.season_resume(t public.tasks, today date)
returns date
language sql immutable set search_path = ''
as $$
  select case t.recurrence_type
    when 'calendar' then private.next_occurrence(t, today - 1)
    else private.season_start_on_or_after(t, today)
  end;
$$;

-- Flytter oppgaver som var forfalt da perioden sluttet, til neste periode. Returnerer antall.
-- Kjøres hver time av pg_cron (under). p_now gjør den testbar med faste tidspunkter.
-- Utsettelsen nullstilles, fordi den utsatte datoen er passert.
create function private.roll_over_seasons(p_now timestamptz default now())
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  n int;
begin
  update public.tasks t
  set next_due_on    = private.season_resume(t, private.local_today(h.timezone, p_now)),
      postponed_from = null,
      postponed_to   = null
  from public.households h
  where h.id = t.household_id
    and t.archived_at is null
    and t.season_start_month is not null
    and t.next_due_on is not null
    and private.season_gap_after(t, t.next_due_on) <= private.local_today(h.timezone, p_now);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Maler: kopier perioden. Ellers uendret fra 20261117140000_task_templates.sql.
-- ---------------------------------------------------------------------------
create or replace function public.activate_templates(p_household_id uuid, p_template_ids uuid[])
returns integer
language plpgsql
security invoker set search_path = ''
as $$
declare
  n int;
begin
  insert into public.tasks
    (household_id, template_id, title, description, category,
     recurrence_type, recurrence_unit, recurrence_every, weekdays, month_day, month,
     season_start_month, season_end_month)
  select p_household_id, tt.id, tt.title, tt.description, tt.category,
         tt.recurrence_type, tt.recurrence_unit, tt.recurrence_every, tt.weekdays, tt.month_day, tt.month,
         tt.season_start_month, tt.season_end_month
  from public.task_templates tt
  where tt.id = any (p_template_ids) and tt.is_active
  order by tt.sort_order
  on conflict (household_id, template_id) where archived_at is null and template_id is not null
  do nothing;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- today_tasks: lages på nytt fordi t.* har fått nye kolonner. Ellers uendret fra
-- 20261118130000_postpone_task.sql.
-- ---------------------------------------------------------------------------
drop view public.today_tasks;

create view public.today_tasks
with (security_invoker = true)
as
select t.*,
       coalesce(private.is_overdue(t, private.household_today(t.household_id)), false) as is_overdue,
       private.is_month_task(t) and not private.is_postponed(t) as is_month_task,
       private.due_by(t)        as due_by
from public.tasks t
where t.archived_at is null
  and (t.next_due_on <= private.household_today(t.household_id) or t.recurrence_type = 'job');

revoke all on public.today_tasks from anon, authenticated;
grant select on public.today_tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Rettigheter. Nye funksjoner i private får execute til public som standard.
-- in_season brukes av matches_pattern, som kjøres av innloggede (via RPC-er som security invoker).
-- roll_over_seasons skal bare kjøres av jobben.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
revoke execute on function private.roll_over_seasons(timestamptz) from authenticated;

-- ---------------------------------------------------------------------------
-- Timesjobb. Hver time, fordi husstander kan ha ulik tidssone.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule('roll-over-seasons', '5 * * * *', 'select private.roll_over_seasons()');

-- ---------------------------------------------------------------------------
-- Maler
-- ---------------------------------------------------------------------------
-- Varmepumpefilteret: bare i fyringssesongen. Ventilasjonsfilteret går hele året (ingen periode).
-- Aktiverte oppgaver er kopier og endres ikke (samme regel som før).
do $$
declare
  n int;
begin
  update public.task_templates
  set season_start_month = 10, season_end_month = 4
  where slug = 'heat-pump-filter';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'expected 1 template heat-pump-filter, got %', n;
  end if;
end;
$$;

insert into public.task_templates
  (slug, title, description, category, requires,
   recurrence_type, recurrence_unit, recurrence_every, season_start_month, season_end_month, sort_order)
values
  ('lawn-mow', 'Klipp plenen',
   'Klipp ofte, og ikke for kort. Da blir plenen tettere, og det blir mindre mose og ugress.',
   'outdoor', '{"has_garden": true}', 'interval', 'week', 1, 5, 9, 30),
  ('weed-beds', 'Luk ugress i bedene',
   'Små ugress er lette å dra opp. Venter du, setter de frø og sprer seg.',
   'outdoor', '{"has_garden": true}', 'interval', 'week', 2, 5, 8, 40);
