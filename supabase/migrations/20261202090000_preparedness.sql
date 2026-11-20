-- Beredskapslager: husstandens svar på DSBs råd om egenberedskap for én uke.
-- Se docs/DATABASE.md §1 (preparedness_items), §4 (malene) og §5 (RLS).
--
-- Hovedregler:
--   - Varelista (tekst, gruppe, mengde og kilde) ligger i appen (src/features/preparedness/catalog.ts).
--     Databasen lagrer bare husstandens svar per vare. En vare uten rad mangler.
--   - item_key sjekkes bare for form, ikke mot en liste (som set_my_avatar), så nyere
--     appversjoner kan legge til varer.
--   - status: null = mangler, 'have' = på plass, 'not_needed' = trenger vi ikke (telles ikke).
--   - expires_on: valgfri holdbarhetsdato, bare når varen er på plass.
--   - RLS: alle medlemmer leser (også barn), voksne med tilgang skriver. Familieskjermen er ikke
--     medlem og ser ingenting. Ingen sletting: et svar fjernes med status = null.
--   - Radene slettes med husstanden (cascade).

create type public.preparedness_status as enum ('have', 'not_needed');

create table public.preparedness_items (
  household_id uuid not null references public.households (id) on delete cascade,
  item_key     text not null,
  status       public.preparedness_status,
  expires_on   date,
  primary key (household_id, item_key),
  constraint preparedness_items_key_format check (item_key ~ '^[a-z_]{1,40}$'),
  -- «is not distinct from»: med status null gir «= 'have'» null, og en check godtar null.
  constraint preparedness_items_expiry_needs_have
    check (expires_on is null or status is not distinct from 'have')
);

alter table public.preparedness_items enable row level security;

revoke all on public.preparedness_items from anon, authenticated;
-- Appen skriver med upsert på primærnøkkelen. PostgREST setter da alle kolonnene i
-- «on conflict do update», så update trenger alle kolonnene. Policyene sørger for at raden
-- bare kan ligge i en husstand der den innloggede er voksen.
grant select, insert, update on public.preparedness_items to authenticated;

create policy preparedness_items_select on public.preparedness_items
  for select to authenticated
  using (household_id in (select private.my_household_ids()));

create policy preparedness_items_insert on public.preparedness_items
  for insert to authenticated
  with check (private.is_adult(household_id) and private.household_has_access(household_id));

create policy preparedness_items_update on public.preparedness_items
  for update to authenticated
  using (private.is_adult(household_id) and private.household_has_access(household_id))
  with check (private.is_adult(household_id) and private.household_has_access(household_id));

-- ---------------------------------------------------------------------------
-- Årshjulsmaler (av til husstanden slår dem på)
-- ---------------------------------------------------------------------------
insert into public.task_templates
  (slug, title, description, category, recurrence_type, recurrence_unit, recurrence_every, month,
   source_name, source_url, sort_order)
values
  ('preparedness-review', 'Gå gjennom beredskapslageret',
   'Bytt ut det som går ut på dato, og fyll på det som mangler i Beredskapslager. Sjekk at vannet er lagret mørkt og kjølig, og at kannene er hele. Egenberedskapsuka er hver høst.',
   'maintenance', 'calendar', 'year', 1, 10, 'DSB',
   'https://www.dsb.no/sikkerhverdag/egenberedskap/slik-bidrar-du-til-norges-beredskap/', 40),
  ('preparedness-water', 'Bytt vannet i beredskapslageret',
   'DSB sier at rent vann i godt rengjorte kanner kan lagres lenge. Mange bytter det likevel én gang i året for å være sikre.',
   'maintenance', 'calendar', 'year', 1, 4, 'DSB',
   'https://www.dsb.no/sikkerhverdag/egenberedskap/vann-i-beredskap/', 40);
