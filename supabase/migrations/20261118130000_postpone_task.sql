-- «Utsett til» for voksne i «I dag». Se docs/DATABASE.md §2 (Utsettelse) og §5.
--
-- Modell: en oppgave har én åpen forekomst om gangen (next_due_on). Å utsette = flytte
-- next_due_on til en senere dag. Gjentakelsen røres ikke. compute_next_due tar allerede
-- max(frist, utført) for kalender og «fra utført» for intervall, så mønsteret fortsetter
-- etter den utsatte datoen. Forekomster mellom i dag og ny dato hoppes over, som når en
-- oppgave blir gjort for sent. Derfor kan oppgaven heller aldri vises to ganger samme dag.
--
-- To nye kolonner husker utsettelsen:
--   postponed_from: next_due_on før utsettelsen (til «Angre»)
--   postponed_to:   datoen den ble flyttet til
-- Oppgaven er utsatt så lenge postponed_to = next_due_on (private.is_postponed). Krysses den
-- av, får den ny frist, og utsettelsen slutter å gjelde av seg selv. Angres avkrysningen,
-- settes fristen tilbake til den utsatte datoen, og den er utsatt igjen. Derfor endres
-- verken complete_task eller angring.
--
-- En utsatt månedsoppgave er en fast dato: due_by = next_due_on, og today_tasks.is_month_task
-- er false. private.is_month_task selv er uendret, fordi first_due og påminnelsene bruker den
-- om selve gjentakelsen.
--
-- Feil (errcode P0001, nøkkel som melding, se src/lib/errors.ts):
--   not_adult               barn, annen husstand, ukjent eller arkivert oppgave
--   subscription_required   prøvetid utløpt
--   not_postponable         jobb, utført engangsoppgave, eller ikke i «I dag» ennå
--   invalid_date            i dag, bakover, eller mer enn ett år fram
--   undo_postpone_expired   oppgaven er krysset av eller endret siden

alter table public.tasks
  add column postponed_from date,
  add column postponed_to date,
  add constraint tasks_postponed_both
    check ((postponed_from is null) = (postponed_to is null));

-- Ingen kolonnerettigheter: bare postpone_task og undo_postpone skriver dem.

-- ---------------------------------------------------------------------------
-- Hjelpere
-- ---------------------------------------------------------------------------
create function private.is_postponed(t public.tasks)
returns boolean
language sql immutable set search_path = ''
as $$
  select t.postponed_to is not null and t.postponed_to = t.next_due_on;
$$;

-- Som før, men en utsatt månedsoppgave har den utsatte datoen som frist.
create or replace function private.due_by(t public.tasks)
returns date
language sql immutable set search_path = ''
as $$
  select case
    when private.is_month_task(t) and t.next_due_on is not null
         and not private.is_postponed(t) then
      make_date(extract(year from t.next_due_on)::int,
                extract(month from t.next_due_on)::int,
                private.last_day_of_month(t.next_due_on))
    else t.next_due_on
  end;
$$;

-- Låser oppgaven og sjekker at kalleren er voksen i husstanden, med abonnement.
create function private.lock_task_for_adult(p_task_id uuid)
returns public.tasks
language plpgsql security definer set search_path = ''
as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found or t.archived_at is not null or not private.is_adult(t.household_id) then
    raise exception 'not_adult' using errcode = 'P0001';
  end if;
  if not private.household_has_access(t.household_id) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;
  return t;
end;
$$;

-- is_postponed brukes i today_tasks (security_invoker), så innloggede må kunne kjøre den.
revoke execute on function private.is_postponed(public.tasks) from public, anon;
grant  execute on function private.is_postponed(public.tasks) to authenticated;
revoke execute on function private.lock_task_for_adult(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggeren: vanlig redigering av gjentakelse eller dato nullstiller utsettelsen.
-- RPC-ene under endrer postponed_to i samme spørring, og da står den. Ellers uendret fra
-- 20261118110000_once_on.sql.
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

-- ---------------------------------------------------------------------------
-- postpone_task: flytt denne forekomsten til p_to. Returnerer fristen før utsettelsen.
-- ---------------------------------------------------------------------------
create function public.postpone_task(p_task_id uuid, p_to date)
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

  if t.recurrence_type = 'job' or t.next_due_on is null or t.next_due_on > today then
    raise exception 'not_postponable' using errcode = 'P0001';
  end if;
  if p_to is null or p_to <= today or p_to > today + 366 then
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

-- ---------------------------------------------------------------------------
-- undo_postpone: «Angre». Fristen før utsettelsen kommer tilbake, også om den var forfalt.
-- Bare så lenge oppgaven fortsatt er utsatt (ikke krysset av eller redigert siden).
-- ---------------------------------------------------------------------------
create function public.undo_postpone(p_task_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  t public.tasks;
begin
  t := private.lock_task_for_adult(p_task_id);

  if not private.is_postponed(t) then
    raise exception 'undo_postpone_expired' using errcode = 'P0001';
  end if;

  if t.recurrence_type = 'once' then
    -- Triggeren flytter en passert once_on til i dag og gir ny frist. Fristen settes derfor
    -- i en egen spørring etterpå, så en forfalt oppgave blir forfalt igjen.
    update public.tasks
    set once_on = t.postponed_from, postponed_from = null, postponed_to = null
    where id = t.id;
  end if;

  update public.tasks
  set next_due_on = t.postponed_from, postponed_from = null, postponed_to = null
  where id = t.id;
end;
$$;

revoke execute on function public.postpone_task(uuid, date) from public, anon;
grant  execute on function public.postpone_task(uuid, date) to authenticated;
revoke execute on function public.undo_postpone(uuid)       from public, anon;
grant  execute on function public.undo_postpone(uuid)       to authenticated;

-- ---------------------------------------------------------------------------
-- today_tasks: lages på nytt fordi t.* har fått nye kolonner. En utsatt månedsoppgave er
-- ikke lenger en månedsoppgave i «I dag». Ellers uendret.
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
