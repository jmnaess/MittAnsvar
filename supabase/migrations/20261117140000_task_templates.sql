-- Steg 7: årshjul med maler og månedsoppgaver.
-- Se docs/DATABASE.md §1 (tasks.template_id), §2 (månedsoppgaver) og §4 (task_templates).
--
-- Hovedregler:
--   - En MÅNEDSOPPGAVE er en årlig kalenderoppgave uten dag (calendar, year, month_day null).
--     next_due_on er den 1. i måneden (vinduet åpner), og oppgaven er først forfalt etter siste
--     dag i måneden (private.due_by). Ingen nye kolonner: modellen hadde allerede denne formen.
--   - Maler er globale og les-bare. Når en mal aktiveres, kopieres den til en vanlig oppgave
--     med template_id. Samme mal kan bare være aktiv én gang per husstand.

-- ---------------------------------------------------------------------------
-- Månedsoppgaver
-- ---------------------------------------------------------------------------

create function private.is_month_task(t public.tasks)
returns boolean
language sql immutable set search_path = ''
as $$
  select t.recurrence_type = 'calendar' and t.recurrence_unit = 'year' and t.month_day is null;
$$;

-- Siste dag oppgaven kan gjøres uten å være forfalt.
--   Månedsoppgave: siste dag i måneden til next_due_on.
--   Ellers:        next_due_on.
create function private.due_by(t public.tasks)
returns date
language sql immutable set search_path = ''
as $$
  select case
    when private.is_month_task(t) and t.next_due_on is not null then
      make_date(extract(year from t.next_due_on)::int,
                extract(month from t.next_due_on)::int,
                private.last_day_of_month(t.next_due_on))
    else t.next_due_on
  end;
$$;

-- Egen funksjon med «i dag» som parameter, så månedsskifte og årsskifte kan testes med faste datoer.
create function private.is_overdue(t public.tasks, today date)
returns boolean
language sql immutable set search_path = ''
as $$
  select private.due_by(t) < today;
$$;

-- Første frist. Endring fra steg 5: en månedsoppgave som lages I sin egen måned, får frist
-- den 1. i denne måneden (og vises i «Denne måneden»), ikke samme måned neste år.
create or replace function private.first_due(t public.tasks)
returns date
language sql immutable set search_path = ''
as $$
  select case
    when private.is_month_task(t) then
      private.next_occurrence(t, make_date(extract(year from t.anchor_on)::int,
                                           extract(month from t.anchor_on)::int, 1) - 1)
    when t.recurrence_type = 'calendar' then private.next_occurrence(t, t.anchor_on - 1)
    else t.anchor_on
  end;
$$;

-- ---------------------------------------------------------------------------
-- Maler (globale, les-bare for klienten)
-- ---------------------------------------------------------------------------
create table public.task_templates (
  id               uuid primary key default gen_random_uuid(),
  -- Stabil nøkkel. Senere migrasjoner finner malen på slug, ikke på id.
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title            text not null check (char_length(btrim(title)) between 1 and 80),
  description      text not null check (char_length(description) between 1 and 300),
  category         text not null check (category in (
                     'daily', 'cleaning', 'kitchen', 'laundry',
                     'outdoor', 'maintenance', 'safety', 'other')),
  -- null = passer for alle.
  household_types  public.household_type[],
  housing_types    public.housing_type[],

  -- Samme gjentakelseskolonner som tasks, unntatt anchor_on (settes ved aktivering).
  recurrence_type  public.recurrence_type not null,
  recurrence_unit  public.recurrence_unit,
  recurrence_every smallint check (recurrence_every between 1 and 100),
  weekdays         smallint[],
  month_day        smallint check (month_day between 1 and 31),
  month            smallint check (month between 1 and 12),

  source_url       text,
  sort_order       smallint not null default 0,
  -- Maler slettes ikke (oppgaver peker på dem), de deaktiveres.
  is_active        boolean not null default true,

  constraint task_templates_weekdays_valid check (
    weekdays is null
    or (cardinality(weekdays) between 1 and 7 and weekdays <@ '{1,2,3,4,5,6,7}'::smallint[])
  ),
  -- Samme regel som tasks_recurrence_valid.
  constraint task_templates_recurrence_valid check (
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
          else false
        end
    end
  )
);

revoke all on public.task_templates from anon, authenticated;
grant select on public.task_templates to authenticated;

alter table public.task_templates enable row level security;

create policy task_templates_select on public.task_templates
  for select to authenticated
  using (is_active);

-- ---------------------------------------------------------------------------
-- tasks.template_id
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column template_id uuid references public.task_templates (id) on delete set null;

-- Samme mal kan bare være aktiv én gang per husstand. Arkiverte oppgaver teller ikke, så en
-- deaktivert mal kan aktiveres igjen (som en ny oppgave; historikken blir på den gamle).
create unique index tasks_household_template_key on public.tasks (household_id, template_id)
  where archived_at is null and template_id is not null;

-- template_id kan settes ved insert (activate_templates kjører som den innloggede), men ikke endres.
grant insert (template_id) on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- today_tasks: nå med månedsoppgaver
-- Viewet må lages på nytt: t.* har fått en ny kolonne (template_id), og create or replace
-- godtar bare nye kolonner til slutt.
-- ---------------------------------------------------------------------------
drop view public.today_tasks;

create view public.today_tasks
with (security_invoker = true)
as
select t.*,
       private.is_overdue(t, private.household_today(t.household_id)) as is_overdue,
       private.is_month_task(t) as is_month_task,
       private.due_by(t)        as due_by
from public.tasks t
where t.archived_at is null
  and t.next_due_on <= private.household_today(t.household_id);

revoke all on public.today_tasks from anon, authenticated;
grant select on public.today_tasks to authenticated;

-- ---------------------------------------------------------------------------
-- activate_templates: aktiver én eller flere maler
--
-- Kopierer malene til vanlige oppgaver. Maler som allerede er aktive i husstanden, hoppes over.
-- Returnerer antall nye oppgaver.
--
-- security invoker: RLS på tasks gjelder (bare voksne, og prøvetid/abonnement), og triggeren
-- setter anchor_on, created_by og første frist som for andre oppgaver. Ingen egne tilgangssjekker.
-- Feil: 42501 (ikke voksen, annen husstand, utløpt prøvetid).
-- ---------------------------------------------------------------------------
create function public.activate_templates(p_household_id uuid, p_template_ids uuid[])
returns integer
language plpgsql
security invoker set search_path = ''
as $$
declare
  n int;
begin
  insert into public.tasks
    (household_id, template_id, title, description, category,
     recurrence_type, recurrence_unit, recurrence_every, weekdays, month_day, month)
  select p_household_id, tt.id, tt.title, tt.description, tt.category,
         tt.recurrence_type, tt.recurrence_unit, tt.recurrence_every, tt.weekdays, tt.month_day, tt.month
  from public.task_templates tt
  where tt.id = any (p_template_ids) and tt.is_active
  order by tt.sort_order
  on conflict (household_id, template_id) where archived_at is null and template_id is not null
  do nothing;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.activate_templates(uuid, uuid[]) from public, anon;
grant execute on function public.activate_templates(uuid, uuid[]) to authenticated;

-- Nye funksjoner i private får execute til public som standard. Samme opprydding som før.
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Startsett: 22 maler for årshjulet
-- «Hus» = boligtyper med eget tak og uteområde: rekkehus og enebolig.
-- Alle er månedsoppgaver (month_day null), unntatt røykvarslerne (1. desember).
-- Sikkerhetstekstene er generelle og henviser til fagfolk. Gjennomgås manuelt før lansering.
-- ---------------------------------------------------------------------------
insert into public.task_templates
  (slug, title, description, category, household_types, housing_types,
   recurrence_type, recurrence_unit, recurrence_every, month, month_day, sort_order)
values
  ('fridge-deep-clean', 'Vask kjøleskapet grundig',
   'Ta ut alt, kast det som er gått ut, og vask hyller og skuffer med lunkent vann og litt oppvaskmiddel. Tørk godt før maten settes inn igjen.',
   'kitchen', null, null, 'calendar', 'year', 1, 1, null, 10),

  ('ventilation-valves', 'Sjekk og rens ventilasjonsventiler',
   'Støv i ventilene gir dårligere luft. Tørk av eller støvsug ventilene, og la innstillingen på dem være som den er.',
   'maintenance', null, null, 'calendar', 'year', 1, 3, null, 10),
  ('earth-fault-breaker', 'Trykk på testknappen på jordfeilbryteren',
   'Trykk på testknappen i sikringsskapet. Bryteren skal slå ut, og så slår du den på igjen. Slår den ikke ut, kontakt en elektriker.',
   'safety', null, null, 'calendar', 'year', 1, 3, null, 20),

  ('summer-tyres', 'Bytt til sommerdekk',
   'Sjekk mønsteret og lufttrykket når dekkene byttes, og bytt dekk som er slitt eller skadet.',
   'maintenance', null, null, 'calendar', 'year', 1, 4, null, 10),
  ('windows-outside', 'Vask vinduer ute',
   'Vask helst når det er overskyet. I sterk sol tørker vannet før du rekker å tørke av, og det blir striper.',
   'cleaning', null, null, 'calendar', 'year', 1, 4, null, 20),
  ('kids-clothes-summer', 'Gå gjennom barneklær før sommeren',
   'Legg bort vinterklærne og se hva som er blitt for lite. Da vet dere hva som trengs til sommeren.',
   'other', '{family}', null, 'calendar', 'year', 1, 4, null, 30),
  ('roof-check', 'Sjekk taket etter vinteren',
   'Se etter løse eller knuste takstein og skader etter snø og is. Bruk gjerne kikkert fra bakken, og overlat arbeid på taket til fagfolk.',
   'maintenance', null, '{townhouse,house}', 'calendar', 'year', 1, 4, null, 40),

  ('outdoor-tap-open', 'Åpne utekranen og sjekk for frostskader',
   'Åpne kranen og se etter lekkasje både ute og inne. En frostsprengt kran kan lekke inn i veggen uten at det synes.',
   'maintenance', null, '{townhouse,house}', 'calendar', 'year', 1, 5, null, 10),
  ('gutters-spring', 'Rens takrenner og nedløp',
   'Fjern løv og rusk, så regnvannet renner bort fra huset. Bruk en stødig stige og ha noen i nærheten.',
   'maintenance', null, '{townhouse,house}', 'calendar', 'year', 1, 5, null, 20),
  ('garden-mower', 'Klargjør hage og gressklipper',
   'Rak plenen, rydd bed og sjekk gressklipperen. En sløv kniv river gresset i stedet for å klippe det.',
   'outdoor', null, '{townhouse,house}', 'calendar', 'year', 1, 5, null, 30),

  ('deck-wash-stain', 'Vask og beis terrassen',
   'Vask terrassen og la den tørke godt i noen dager før du beiser. Følg anvisningen på boksen.',
   'outdoor', null, '{townhouse,house}', 'calendar', 'year', 1, 6, null, 10),
  ('bathroom-silicone', 'Sjekk silikonfuger på badet',
   'Se etter sprekker, misfarging og fuger som har løsnet. Skadde fuger kan slippe vann inn bak flisene.',
   'maintenance', null, null, 'calendar', 'year', 1, 6, null, 20),

  ('school-start', 'Gå gjennom skolesaker og barneklær før skolestart',
   'Sjekk sekk, gymtøy, sko og regntøy, og skriv en liste over det som mangler.',
   'other', '{family}', null, 'calendar', 'year', 1, 8, null, 10),

  ('dust-heaters', 'Støvsug panelovner og radiatorer før fyringssesongen',
   'Støv på ovnene kan lukte svidd og gi dårligere luft når varmen slås på. Støvsug og tørk av før det blir kaldt.',
   'cleaning', null, null, 'calendar', 'year', 1, 9, null, 10),
  ('chimney-check', 'Få sjekket pipe og ildsted før fyringssesongen',
   'Se etter sprekker og at dører og pakninger på ildstedet er hele. Feiing og tilsyn gjøres av feiervesenet i kommunen. Spør dem ved tvil.',
   'safety', null, '{townhouse,house}', 'calendar', 'year', 1, 9, null, 20),

  ('winter-tyres', 'Bytt til vinterdekk',
   'Bytt før det blir glatt. Vinterdekk trenger mer mønster enn sommerdekk, så sjekk mønsteret når du bytter.',
   'maintenance', null, null, 'calendar', 'year', 1, 10, null, 10),
  ('gutters-autumn', 'Rens takrenner og nedløp',
   'Når løvet har falt, fjern det fra takrenner og nedløp. Tette renner kan gi is og vannskader i vinter.',
   'maintenance', null, '{townhouse,house}', 'calendar', 'year', 1, 10, null, 20),
  ('outdoor-tap-close', 'Steng og tøm utekranen før frosten',
   'Har utekranen egen stoppekran inne, steng den og åpne kranen ute så vannet renner ut. Da sprekker den ikke i frosten.',
   'maintenance', null, '{townhouse,house}', 'calendar', 'year', 1, 10, null, 30),
  ('garden-furniture', 'Ta inn hagemøbler og puter',
   'Ta inn puter og møbler som ikke tåler vinteren, eller dekk dem godt til. Da holder de lenger.',
   'outdoor', null, '{townhouse,house}', 'calendar', 'year', 1, 10, null, 40),

  ('fire-extinguisher', 'Sjekk at trykkmåleren på brannslukkeren står på grønt',
   'Viseren skal stå på grønt. Står den utenfor, må apparatet kontrolleres eller byttes. Sjekk også at det henger lett tilgjengelig.',
   'safety', null, null, 'calendar', 'year', 1, 11, null, 10),

  ('smoke-alarms', 'Test røykvarslerne og bytt batteri',
   '1. desember er røykvarslerdagen. Trykk på testknappen på alle røykvarslerne, og bytt batteri der det trengs.',
   'safety', null, null, 'calendar', 'year', 1, 12, 1, 10),
  ('kitchen-hood-filter', 'Rens filteret i kjøkkenviften',
   'Fett i filteret gir dårligere avtrekk og kan ta fyr. Metallfiltre kan ofte vaskes i oppvaskmaskinen, kullfiltre må byttes.',
   'kitchen', null, null, 'calendar', 'year', 1, 12, null, 20);
