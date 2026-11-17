-- Steg 5a: oppgaver med gjentakelse.
-- Se docs/DATABASE.md §1 (tasks), §2 (gjentakelse) og §5 (RLS).
--
-- Hovedregler:
--   - Fristen (next_due_on) beregnes ALLTID i databasen. Klienten har ikke lov til å skrive den.
--   - «I dag» er datoen i husstandens tidssone, regnet ut på serveren (private.household_today).
--   - Oppgaver slettes ikke, de arkiveres (archived_at), slik at historikken beholdes.

-- ---------------------------------------------------------------------------
-- Enum-typer
-- ---------------------------------------------------------------------------
create type public.recurrence_type as enum ('once', 'calendar', 'interval');
create type public.recurrence_unit as enum ('day', 'week', 'month', 'year');

-- Trengs for den sammensatte fremmednøkkelen under: (household_id, id) må være unik.
-- id er allerede unik, så dette koster bare en ekstra indeks.
alter table public.members
  add constraint members_household_id_id_key unique (household_id, id);

-- ---------------------------------------------------------------------------
-- Tabell
-- ---------------------------------------------------------------------------
create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references public.households (id) on delete cascade,
  title              text not null check (char_length(btrim(title)) between 1 and 80),
  description        text,
  category           text not null default 'other' check (category in (
                       'daily', 'cleaning', 'kitchen', 'laundry',
                       'outdoor', 'maintenance', 'safety', 'other')),
  -- null = felles («hvem som helst»).
  assigned_member_id uuid,

  -- Gjentakelse (se DATABASE.md §2). Check-constraints under avgjør hvilke som brukes.
  recurrence_type    public.recurrence_type not null,
  recurrence_unit    public.recurrence_unit,
  -- Øvre grense 100 holder løkken i next_occurrence kort (se der).
  recurrence_every   smallint check (recurrence_every between 1 and 100),
  weekdays           smallint[],   -- ISO: 1 = mandag … 7 = søndag
  month_day          smallint check (month_day between 1 and 31),
  month              smallint check (month between 1 and 12),
  -- Settes alltid av triggeren til «i dag» i husstandens tidssone (ved insert og ved ny
  -- gjentakelse). Brukes som startpunkt for «annenhver uke», «hver 3. måned» osv.
  anchor_on          date not null,

  -- Neste frist. null = engangsoppgave som er utført. Settes bare av databasen.
  next_due_on        date,
  created_by         uuid references public.members (id) on delete set null,
  created_at         timestamptz not null default now(),
  archived_at        timestamptz,

  -- Den ansvarlige må være medlem i SAMME husstand. En vanlig FK på assigned_member_id
  -- ville godtatt et medlem i en annen husstand. Slettes medlemmet, blir oppgaven felles.
  constraint tasks_assigned_member_fk
    foreign key (household_id, assigned_member_id)
    references public.members (household_id, id)
    on delete set null (assigned_member_id),

  constraint tasks_weekdays_valid check (
    weekdays is null
    or (cardinality(weekdays) between 1 and 7 and weekdays <@ '{1,2,3,4,5,6,7}'::smallint[])
  ),

  -- Tabellen i DATABASE.md §2, kolonne for kolonne.
  constraint tasks_recurrence_valid check (
    case recurrence_type
      when 'once' then
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
          else false   -- recurrence_unit is null
        end
    end
  )
);

create index tasks_household_due_idx on public.tasks (household_id, next_due_on)
  where archived_at is null;
-- For FK-oppslag når et medlem slettes.
create index tasks_assigned_member_idx on public.tasks (household_id, assigned_member_id);

-- ---------------------------------------------------------------------------
-- Datoer og tilgang
-- ---------------------------------------------------------------------------

-- Datoen i en tidssone på et gitt tidspunkt. Egen funksjon, så den kan testes rundt midnatt
-- med faste tidspunkter.
create function private.local_today(tz text, at timestamptz default now())
returns date
language sql stable set search_path = ''
as $$
  select (at at time zone tz)::date;
$$;

-- «I dag» for en husstand. Alle steder som trenger dagens dato, bruker denne.
create function private.household_today(hid uuid)
returns date
language sql stable security definer set search_path = ''
as $$
  select private.local_today(h.timezone) from public.households h where h.id = hid;
$$;

-- Prøvetid. Aktivt abonnement (household_subscriptions) legges til i steg 17.
create function private.household_has_access(hid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.households h where h.id = hid and h.trial_ends_at > now()
  );
$$;

-- ---------------------------------------------------------------------------
-- Gjentakelse
-- ---------------------------------------------------------------------------

-- Siste dag i måneden til d. «Den 31.» betyr den 30. i november og den 28./29. i februar.
create function private.last_day_of_month(d date)
returns smallint
language sql immutable set search_path = ''
as $$
  select extract(day from
    (make_date(extract(year from d)::int, extract(month from d)::int, 1) + interval '1 month')::date - 1
  )::smallint;
$$;

-- Er d en forekomst i oppgavens kalendermønster?
-- Mandagen i uken brukes i stedet for ISO-ukenummer, så uke 53 og årsskifte ikke trenger
-- spesialhåndtering. date_trunc unngås fordi den går via timestamptz og sesjonens tidssone.
create function private.matches_pattern(t public.tasks, d date)
returns boolean
language sql immutable set search_path = ''
as $$
  select case t.recurrence_unit
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

-- Første dato etter «after» som passer mønsteret. Går dag for dag. Det er enkelt å lese,
-- og raskt nok: verste tilfelle (hvert 100. år) er ca. 37 000 dager.
--
-- Sperren mot evig løkke regnes ut fra oppgaven: (every + 1) hele perioder. Neste treff ligger
-- aldri lenger unna enn én periode pluss justeringen mot anchor_on, så sperren slår bare til
-- ved en feil i mønsteret. Da kastes en tydelig feil i stedet for å returnere null.
create function private.next_occurrence(t public.tasks, after date)
returns date
language plpgsql immutable set search_path = ''
as $$
declare
  d date := after;
  max_days int := (t.recurrence_every + 1) * case t.recurrence_unit
    when 'day' then 1 when 'week' then 7 when 'month' then 31 when 'year' then 366 end;
begin
  -- Ufullstendig mønster: gi null og la check-constraintene på tabellen avvise raden
  -- med en vanlig valideringsfeil (23514). Triggeren kjører før constraintene.
  if t.recurrence_every is null
     or t.recurrence_unit is null
     or (t.recurrence_unit = 'week' and t.weekdays is null)
     or (t.recurrence_unit = 'month' and t.month_day is null)
     or (t.recurrence_unit = 'year' and t.month is null) then
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

-- Neste frist etter at oppgaven ble utført på completed_on. Se DATABASE.md §2.
--   once:     null (ferdig)
--   interval: completed_on + every × enhet (fra faktisk utført)
--   calendar: første forekomst etter max(frist, utført). Tapte forekomster hoper seg ikke opp.
create function private.compute_next_due(t public.tasks, completed_on date)
returns date
language plpgsql immutable set search_path = ''
as $$
begin
  case t.recurrence_type
    when 'once' then
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

-- Første frist for en ny (eller endret) oppgave.
--   once/interval: anchor_on
--   calendar:      første forekomst på eller etter anchor_on
create function private.first_due(t public.tasks)
returns date
language sql immutable set search_path = ''
as $$
  select case t.recurrence_type
    when 'calendar' then private.next_occurrence(t, t.anchor_on - 1)
    else t.anchor_on
  end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: setter anchor_on, created_by og next_due_on
-- Klienten kan ikke skrive disse kolonnene (se grants). Kolonnerettigheter sjekkes bare
-- for kolonnene i selve spørringen, så triggeren kan likevel sette dem.
-- ---------------------------------------------------------------------------
create function private.tasks_set_defaults()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.anchor_on  := private.household_today(new.household_id);
    new.created_by := private.my_member_id(new.household_id);
    new.next_due_on := private.first_due(new);
  elsif (new.recurrence_type, new.recurrence_unit, new.recurrence_every,
         new.weekdays, new.month_day, new.month)
        is distinct from
        (old.recurrence_type, old.recurrence_unit, old.recurrence_every,
         old.weekdays, old.month_day, old.month) then
    -- Ny gjentakelse: start på nytt fra i dag.
    new.anchor_on   := private.household_today(new.household_id);
    new.next_due_on := private.first_due(new);
  end if;
  return new;
end;
$$;

create trigger tasks_set_defaults
  before insert or update on public.tasks
  for each row execute function private.tasks_set_defaults();

-- Nye funksjoner får execute til public som standard. Samme opprydding som i steg 2.
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Kolonnerettigheter
-- ---------------------------------------------------------------------------
revoke all on public.tasks from anon, authenticated;
grant select on public.tasks to authenticated;
grant insert (household_id, title, description, category, assigned_member_id,
              recurrence_type, recurrence_unit, recurrence_every, weekdays, month_day, month)
  on public.tasks to authenticated;
grant update (title, description, category, assigned_member_id,
              recurrence_type, recurrence_unit, recurrence_every, weekdays, month_day, month,
              archived_at)
  on public.tasks to authenticated;
-- Ingen delete: oppgaver arkiveres. next_due_on, anchor_on og created_by settes av databasen.

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;

create policy tasks_select on public.tasks
  for select to authenticated
  using (household_id in (select private.my_household_ids()));

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (private.is_adult(household_id) and private.household_has_access(household_id));

create policy tasks_update on public.tasks
  for update to authenticated
  using (private.is_adult(household_id))
  with check (private.is_adult(household_id));

-- ---------------------------------------------------------------------------
-- «I dag»: forfalte oppgaver og oppgaver som forfaller i dag
-- security_invoker: viewet kjører som den innloggede, så RLS på tasks gjelder.
-- ---------------------------------------------------------------------------
create view public.today_tasks
with (security_invoker = true)
as
select t.*,
       t.next_due_on < private.household_today(t.household_id) as is_overdue
from public.tasks t
where t.archived_at is null
  and t.next_due_on <= private.household_today(t.household_id);

revoke all on public.today_tasks from anon, authenticated;
grant select on public.today_tasks to authenticated;
