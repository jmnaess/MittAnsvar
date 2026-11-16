-- Steg 2: households, members, hjelpefunksjoner, RLS og kolonnerettigheter.
-- Se docs/DATABASE.md §1 (tabeller) og §5 (RLS).

-- ---------------------------------------------------------------------------
-- Enum-typer (bare de som trengs nå; resten kommer med tabellene som bruker dem)
-- ---------------------------------------------------------------------------
create type public.household_type as enum ('single', 'couple', 'family');
create type public.housing_type   as enum ('apartment', 'townhouse', 'house');
create type public.feedback_tone  as enum ('fact', 'humor', 'both');
create type public.member_role    as enum ('adult', 'child');

-- ---------------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------------
create table public.households (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 50),
  type          public.household_type not null,
  housing_type  public.housing_type not null,
  feedback_tone public.feedback_tone not null default 'both',
  timezone      text not null default 'Europe/Oslo',
  -- Settes av create_household (senere steg). Kan ikke endres fra klient (se grants under).
  trial_ends_at timestamptz not null,
  created_at    timestamptz not null default now()
);

create table public.members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  role         public.member_role not null,
  display_name text not null check (char_length(display_name) between 1 and 30),
  avatar       text not null,
  birth_year   smallint,
  -- Voksen: e-postbruker. Barn: anonym bruker på egen enhet, ellers null.
  -- unique = én husstand per bruker i MVP.
  -- set null: barneprofilen består selv om barnets anonyme bruker slettes.
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint members_adult_has_no_birth_year check (role <> 'adult' or birth_year is null)
);

-- Brukes av FK-oppslag (cascade) og av alle RLS-policyer på members.
create index members_household_id_idx on public.members (household_id);

-- ---------------------------------------------------------------------------
-- Hjelpefunksjoner i schema private (ikke eksponert i API-et, se config.toml [api].schemas)
--
-- security definer: kjører som eieren og omgår RLS. Uten dette ville policyen på
--   members lese members, som igjen trigger policyen → uendelig rekursjon.
-- set search_path = '': alle navn må være fullt kvalifisert, så ingen kan
--   "kapre" funksjonen ved å lage egne objekter med samme navn.
-- ---------------------------------------------------------------------------
create schema private;

create function private.my_household_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.household_id
  from public.members m
  where m.auth_user_id = auth.uid();
$$;

create function private.is_adult(hid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.household_id = hid
      and m.auth_user_id = auth.uid()
      and m.role = 'adult'
  );
$$;

create function private.my_member_id(hid uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.id
  from public.members m
  where m.household_id = hid
    and m.auth_user_id = auth.uid();
$$;

-- Policyene evalueres som den innloggede rollen, så authenticated må få bruke funksjonene.
-- Nye funksjoner får execute til public som standard; det fjerner vi.
revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Kolonnerettigheter
-- Supabase gir anon/authenticated alle rettigheter på nye tabeller i public.
-- RLS styrer hvilke RADER man når; grant styrer hvilke KOLONNER og operasjoner.
-- Vi tar bort alt og gir bare det som trengs.
-- ---------------------------------------------------------------------------
revoke all on public.households from anon, authenticated;
grant select on public.households to authenticated;
grant update (name, type, housing_type, feedback_tone) on public.households to authenticated;
-- Ingen insert/delete: skjer via RPC create_household og Edge Function delete-account.

revoke all on public.members from anon, authenticated;
grant select, insert, delete on public.members to authenticated;
grant update (display_name, avatar, birth_year) on public.members to authenticated;
-- auth_user_id, role og household_id kan dermed aldri endres fra klienten.

-- ---------------------------------------------------------------------------
-- Row Level Security
-- (select private.fn()) gjør at funksjonen evalueres én gang per spørring, ikke per rad.
-- Mangler en policy for en operasjon, nekter RLS den.
-- ---------------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.members    enable row level security;

-- households
create policy households_select on public.households
  for select to authenticated
  using (id in (select private.my_household_ids()));

create policy households_update on public.households
  for update to authenticated
  using (private.is_adult(id))
  with check (private.is_adult(id));

-- members
create policy members_select on public.members
  for select to authenticated
  using (household_id in (select private.my_household_ids()));

-- Voksne kan bare legge til barneprofiler uten enhet. Voksne legges til via RPC (invitasjon),
-- og enheter kobles via redeem_link_token.
create policy members_insert on public.members
  for insert to authenticated
  with check (
    private.is_adult(household_id)
    and role = 'child'
    and auth_user_id is null
  );

create policy members_update on public.members
  for update to authenticated
  using (private.is_adult(household_id))
  with check (private.is_adult(household_id));

-- Voksne slettes via Edge Function delete-account, ikke fra klienten.
create policy members_delete on public.members
  for delete to authenticated
  using (private.is_adult(household_id) and role = 'child');
