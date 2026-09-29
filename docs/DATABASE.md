# MittAnsvar – database

Postgres i Supabase (EU). Tabell- og kolonnenavn er på engelsk, innholdstekster på norsk.
Alle tabeller i `public` har RLS på. Bakgrunn og flyt: se [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Tabeller, kolonner og relasjoner

```
auth.users ─┐ (0..1)
            ▼
households 1──* members 1──* task_completions *──1 tasks *──1 households
    │  1                 (assigned_member_id)──────────┘ │
    │  └──1 household_subscriptions                      └──0..1 task_templates
    └──* link_tokens                  feedback_messages (global, les-bare)
```

### Enum-typer
| Type | Verdier |
|------|---------|
| `household_type` | `single`, `couple`, `family` |
| `housing_type` | `apartment`, `townhouse`, `house` |
| `feedback_tone` | `fact`, `humor`, `both` |
| `member_role` | `adult`, `child` |
| `audience` | `adult`, `child`, `any` |
| `recurrence_type` | `once`, `calendar`, `interval` |
| `recurrence_unit` | `day`, `week`, `month`, `year` |
| `link_kind` | `adult`, `child` |

### `households`
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | `gen_random_uuid()` |
| name | text not null | 1–50 tegn |
| type | household_type not null | styrer forslag |
| housing_type | housing_type not null | styrer årshjul-forslag |
| feedback_tone | feedback_tone not null default `both` | |
| timezone | text not null default `'Europe/Oslo'` | |
| trial_ends_at | timestamptz not null | settes av `create_household`, kan ikke endres fra klient |
| created_at | timestamptz not null default now() | |

### `members`
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households **on delete cascade** | |
| role | member_role not null | |
| display_name | text not null | 1–30 tegn, fornavn/kallenavn |
| avatar | text not null | nøkkel til innebygd illustrasjon, f.eks. `fox` |
| birth_year | smallint null | bare for barn, brukes til alderstilpassede forslag |
| auth_user_id | uuid null **unique** → auth.users on delete set null | voksen: e-postbruker; barn: anonym bruker på egen enhet, ellers null |
| created_at | timestamptz not null default now() | |

- Check: `role = 'adult'` ⇒ `birth_year is null`.
- `unique(auth_user_id)` betyr én husstand per bruker i MVP. Fjernes constrainten senere, tillates flere husstander.
- `on delete set null` (ikke cascade): hvis barnets anonyme bruker slettes, skal barneprofilen bestå. `delete-account` sletter den voksnes `members`-rad eksplisitt.

### `link_tokens` (QR for barneenhet og invitasjon av voksen)
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | |
| kind | link_kind not null | |
| member_id | uuid null → members on delete cascade | påkrevd når `kind = 'child'` |
| token_hash | bytea not null unique | SHA-256 av tokenet, råverdien lagres aldri |
| created_by | uuid not null → members on delete cascade | |
| expires_at | timestamptz not null | now() + 10 min |
| used_at | timestamptz null | engangsbruk |

### `tasks`
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | |
| title | text not null | 1–80 tegn |
| description | text null | |
| category | text not null | check: `daily`, `cleaning`, `kitchen`, `laundry`, `outdoor`, `maintenance`, `safety`, `other` |
| assigned_member_id | uuid null → members on delete set null | null = «hvem som helst» |
| template_id | uuid null → task_templates on delete set null | hvilken mal oppgaven ble laget fra |
| *gjentakelse* | se §2 | `recurrence_type`, `recurrence_unit`, `recurrence_every`, `weekdays`, `month_day`, `month`, `anchor_on` |
| next_due_on | date null | neste frist. null = engangsoppgave som er utført |
| created_by | uuid null → members on delete set null | |
| created_at | timestamptz not null default now() | |
| archived_at | timestamptz null | «slettede» oppgaver arkiveres, slik at historikken beholdes |

Indeks: `(household_id, next_due_on) where archived_at is null`.

### `task_completions` → §3
### `task_templates`, `feedback_messages` → §4

### `household_subscriptions`
| Kolonne | Type | Merknad |
|---------|------|---------|
| household_id | uuid pk → households on delete cascade | = RevenueCat App User ID |
| is_active | boolean not null | entitlement `premium` er aktiv |
| product_id | text null | `monthly` / `yearly` |
| store | text null | `app_store` / `play_store` |
| expires_at | timestamptz null | |
| updated_at | timestamptz not null | |

Tabellen skrives bare av Edge Function `revenuecat-webhook` med service role.

---

## 2. Gjentakelse: fast kalender og intervall

Én tabell, ett sett kolonner. `recurrence_type` avgjør hvilke kolonner som brukes:

| Kolonne | Type | `once` | `calendar` | `interval` |
|---------|------|--------|------------|------------|
| recurrence_type | recurrence_type not null | ✓ | ✓ | ✓ |
| recurrence_unit | recurrence_unit null | – | ✓ | ✓ |
| recurrence_every | smallint null (≥ 1) | – | ✓ «hver N.» | ✓ «N enheter etter» |
| weekdays | smallint[] null (ISO 1=man … 7=søn) | – | påkrevd når unit = `week` | – |
| month_day | smallint null (1–31) | – | påkrevd når unit = `month`, valgfri når unit = `year` | – |
| month | smallint null (1–12) | – | påkrevd når unit = `year` | – |
| anchor_on | date not null | frist | startdato (for «annenhver uke») | første frist |

Check-constraints håndhever tabellen over, slik at ugyldige kombinasjoner ikke kan lagres.

**Eksempler**

| Oppgave | Lagres som |
|---------|------------|
| Tømme søppel hver søndag | calendar, week, every 1, weekdays `{7}` |
| Støvsuge man og tors | calendar, week, every 1, weekdays `{1,4}` |
| Skifte sengetøy annenhver lørdag | calendar, week, every 2, weekdays `{6}`, anchor_on = første lørdag |
| Betale regninger den 20. | calendar, month, every 1, month_day 20 (31 → siste dag i måneden) |
| Rense takrenner i oktober | calendar, year, every 1, month 10, month_day null (= «i løpet av oktober», frist den 1.) |
| Rense sluk 3 mnd etter sist | interval, month, every 3 |
| Bytte batteri i røykvarsler | calendar, year, every 1, month 12, month_day 1 |

**Beregning av neste frist** skjer i databasen, i `private.compute_next_due(p_task public.tasks, p_completed_on date) returns date`. Funksjonen er `language plpgsql immutable` og ligger i schemaet `private`, som ikke eksponeres i API-et:
- `once`: gir `null` (oppgaven er ferdig).
- `interval`: `completed_on + every × unit`. Det er fra *faktisk utført*, uavhengig av fristen. Månedsregning følger Postgres: 31. januar + 1 måned = 28. (eller 29.) februar.
- `calendar`: første forekomst i mønsteret som er **etter** `max(next_due_on, completed_on)`.
  - Gjort tidlig (lørdag, frist søndag): neste frist blir søndagen etter.
  - Gjort sent (mandag): neste frist blir førstkommende søndag. Tapte forekomster hoper seg ikke opp.

Hvorfor i databasen? Regelen finnes ett sted, klienten kan ikke sende en feil frist, og `completed_on` settes uansett av serveren. Funksjonen leser ingen tabeller, så den er lett å teste. Den implementeres som en enkel løkke som går dag for dag til mønsteret treffer. Det er lesbart og raskt nok for MVP.

**pgTAP-tester** (`supabase/tests/compute_next_due.test.sql`), minimum:

| # | Oppgave | Frist | Utført | Forventet neste frist |
|---|---------|-------|--------|-----------------------|
| 1 | Engangsoppgave | 2026-10-04 | 2026-10-04 | `null` |
| 2 | Hver søndag | søn 2026-10-04 | søn 2026-10-04 | 2026-10-11 |
| 3 | Hver søndag, gjort tidlig | søn 2026-10-04 | lør 2026-10-03 | 2026-10-11 |
| 4 | Hver søndag, gjort sent | søn 2026-10-04 | man 2026-10-05 | 2026-10-11 |
| 5 | Man og tors | man 2026-10-05 | man 2026-10-05 | tors 2026-10-08 |
| 6 | Annenhver lørdag, `anchor_on` 2026-10-03 | lør 2026-10-03 | lør 2026-10-03 | 2026-10-17 |
| 7 | Den 20. hver måned | 2026-10-20 | 2026-10-20 | 2026-11-20 |
| 8 | Den 31. hver måned | 2026-10-31 | 2026-10-31 | 2026-11-30 |
| 9 | Den 31. hver måned, skuddår | 2028-01-31 | 2028-01-31 | 2028-02-29 |
| 10 | I oktober hvert år (`month_day` null) | 2026-10-01 | 2026-10-15 | 2027-10-01 |
| 11 | 3 mnd etter sist utført | 2026-10-01 | 2026-10-10 | 2027-01-10 |
| 12 | 1 mnd etter sist utført | 2027-01-31 | 2027-01-31 | 2027-02-28 |

`next_due_on` lagres på oppgaven. Da blir «I dag» enkel (`next_due_on <= today`).

**Årshjulet** henter fremtidige forekomster med RPC-en `get_upcoming_occurrences(p_household_id uuid, p_from date, p_to date) returns table (task_id uuid, due_on date)`:
- Starter på `next_due_on` for hver aktiv oppgave og kaller `compute_next_due` gjentatte ganger, som om hver forekomst blir utført på fristen.
- Tar bare med oppgaver med enhet `month` eller `year`, pluss engangsoppgaver. Daglige og ukentlige rutiner hører til «I dag» og ville druknet årshjulet.
- Maks 12 måneder (`p_to - p_from <= 366`), ellers feil.
- Er `stable` og `security invoker`. RLS på `tasks` gjelder dermed som vanlig, og funksjonen trenger ingen egne tilgangssjekker.

**Hvorfor ikke RRULE (iCal)?** Det er kraftig, men vanskelig å validere og vise i UI. De sju kolonnene dekker alle behovene i MVP og kan konverteres til RRULE senere.

---

## 3. `task_completions` og historikk

Hver avkrysning blir en ny rad. Tabellen er append-only: raden oppdateres aldri, og slettes bare ved «angre».

| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | denormalisert for enkel RLS |
| task_id | uuid not null → tasks on delete cascade | |
| completed_by_member_id | uuid not null → members **on delete cascade** | hvem som gjorde det. Slettes med barneprofilen (GDPR) |
| recorded_by | uuid null → auth.users on delete set null | hvilken innlogget bruker som registrerte (i kiosk: den voksne) |
| completed_on | date not null | lokal dato i husstandens tidssone, **settes av serveren** |
| completed_at | timestamptz not null default now() | |
| due_on | date null | fristen denne avkrysningen dekket. Brukes til «i tide?» og til angring |
| feedback_message_id | uuid null → feedback_messages on delete set null | hvilken tekst som ble vist, for å unngå gjentakelser |

Indekser: `(task_id, completed_at desc)` og `(household_id, completed_on)`.

**Skriving skjer bare via RPC** (`security definer`, `set search_path = ''`):

- `complete_task(p_task_id, p_member_id) returns uuid`
  1. Kalleren er medlem av oppgavens husstand, og oppgaven er ikke arkivert.
  2. `private.household_has_access(household_id)`, ellers feil `subscription_required`.
  3. `p_member_id` hører til samme husstand. Er kalleren et barn, må `p_member_id` være kallerens eget medlem.
  4. `completed_on = (now() at time zone households.timezone)::date`. Klienten sender verken dato eller frist.
  5. Setter inn raden (`due_on` = oppgavens nåværende `next_due_on`) og setter `tasks.next_due_on = private.compute_next_due(oppgaven, completed_on)`. Alt skjer i én transaksjon.
- `undo_completion(p_completion_id)`: bare den **siste** avkrysningen på en oppgave. Den kan angres av en voksen, eller av den som krysset av, innen 10 minutter. Raden slettes, og `tasks.next_due_on` settes tilbake til `due_on`.

**Historikkspørringer** (vanlig select, ingen egne tabeller):
- Sist utført: `select completed_at from task_completions where task_id = $1 order by completed_at desc limit 1`
- Hvem gjorde hva denne uken: `where household_id = $1 and completed_on >= $2`, gruppert på `completed_by_member_id`.

---

## 4. Maler for årshjulet og tilbakemeldingstekster

Begge er globale tabeller uten `household_id`. Innholdet ligger i `supabase/seed/*.sql` i git og legges inn via migrasjon. Brukere kan bare lese.

### `task_templates`
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| slug | text unique not null | stabil nøkkel, f.eks. `clean-gutters` |
| title, description | text | norsk |
| category | text | samme verdier som `tasks.category` |
| is_annual_wheel | boolean not null | vises i årshjul-forslag |
| audience | audience not null | voksen, barn eller alle |
| min_age | smallint null | for barn, f.eks. 6 |
| household_types | household_type[] null | null = alle |
| housing_types | housing_type[] null | null = alle (takrenner: `{house, townhouse}`) |
| *gjentakelse* | samme kolonner som `tasks`, unntatt `anchor_on` | |
| suggested_by_default | boolean not null | forhåndsavkrysset i oppstarten |
| source_url | text null | f.eks. DSB for røykvarsler |
| sort_order | smallint | |
| is_active | boolean not null default true | |

**Bruk:** Når en mal velges, **kopieres** feltene til en ny `tasks`-rad med `template_id` satt. Husstanden kan endre sin kopi fritt, og senere endringer i malen påvirker ikke eksisterende oppgaver. `anchor_on` settes til i dag eller til neste forekomst av `month`.

Forslag filtreres i TypeScript (`templates/suggest.ts`) på husstandstype, boligtype og barnas alder (fra `birth_year`).

### `feedback_messages`
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| tone | text not null | `fact` / `humor` (ikke `both`, det er et filter) |
| text | text not null | «Visste du at …» / «Hvor mange hybelkaniner fant du?» |
| audience | audience not null | |
| template_id | uuid null → task_templates | mest spesifikk |
| category | text null | nest mest spesifikk. Er begge null, er teksten generell |
| is_active | boolean not null default true | |

**Utvalg** (`feedback/pickFeedback.ts`, på klienten):
1. Alle aktive tekster hentes én gang og caches (noen hundre rader).
2. Filtrer på husstandens tone og målgruppen til den som krysset av.
3. Velg tilfeldig fra den mest spesifikke gruppen som ikke er tom (mal → kategori → generell). Hopp over de siste 20 viste tekstene i husstanden.

---

## 5. Row Level Security

### Hjelpefunksjoner (schema `private`, ikke eksponert i API-et)
Alle er `language sql stable security definer set search_path = ''`. Da unngås rekursjon, fordi policyer på `members` ellers ville lest `members` på nytt.

```sql
private.my_household_ids()        returns setof uuid  -- household_id for auth.uid()
private.is_adult(hid uuid)        returns boolean     -- auth.uid() er voksen i hid
private.my_member_id(hid uuid)    returns uuid
private.household_has_access(hid) returns boolean     -- prøvetid eller aktivt abonnement
```

Policyer bruker `household_id in (select private.my_household_ids())`. Innpakningen i `select` gjør at funksjonen evalueres én gang per spørring, ikke én gang per rad.

Merk: Anonyme brukere (barneenheter) har også rollen `authenticated`. Det er trygt, fordi hver policy krever medlemskap via `auth_user_id`.

### Policyer per tabell

| Tabell | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| households | medlem | – (RPC `create_household`) | voksen; kolonner: `name`, `type`, `housing_type`, `feedback_tone` | – (Edge `delete-account`) |
| members | medlem i samme husstand | voksen, bare `role = 'child'` og `auth_user_id is null` | voksen; kolonner: `display_name`, `avatar`, `birth_year` | voksen, bare `role = 'child'` |
| tasks | medlem | voksen **og** `household_has_access` | voksen (inkl. arkivering via `archived_at`) | – (arkiver i stedet) |
| task_completions | medlem | – (RPC `complete_task`) | – | – (RPC `undo_completion`) |
| link_tokens | – | – (RPC) | – | – |
| household_subscriptions | medlem | – (service role) | – | – |
| task_templates | alle innloggede, `is_active` | – | – | – |
| feedback_messages | alle innloggede, `is_active` | – | – | – |

«–» betyr at det ikke finnes noen policy, og da nekter RLS operasjonen. Tabeller uten policy er helt stengt for klienten.

**Eksempel (tasks):**
```sql
alter table public.tasks enable row level security;

create policy tasks_select on public.tasks for select to authenticated
  using (household_id in (select private.my_household_ids()));

create policy tasks_insert on public.tasks for insert to authenticated
  with check (private.is_adult(household_id) and private.household_has_access(household_id));

create policy tasks_update on public.tasks for update to authenticated
  using (private.is_adult(household_id))
  with check (private.is_adult(household_id));
```

**Kolonnerettigheter** (RLS styrer rader, `grant` styrer kolonner):
```sql
revoke update on public.members from authenticated;
grant update (display_name, avatar, birth_year) on public.members to authenticated;

revoke update on public.households from authenticated;
grant update (name, type, housing_type, feedback_tone) on public.households to authenticated;
```

### RPC-oversikt
Alle RPC-er er `security definer` og `set search_path = ''`, unntatt `get_upcoming_occurrences`, som bare leser og kjører som `security invoker` (RLS gjelder). `execute` er revoked fra `anon` og `public` og granted til `authenticated`.

| Funksjon | Hvem | Gjør |
|----------|------|------|
| `create_household(name, type, housing_type, display_name, avatar)` | innlogget, ikke-anonym, uten husstand | household + voksen-member, `trial_ends_at = now() + 14 d` |
| `create_link_token(kind, member_id)` | voksen | returnerer råtoken, lagrer hash |
| `redeem_link_token(token, display_name?, avatar?)` | innlogget (anonym for `child`, e-post for `adult`) | kobler `auth_user_id` eller oppretter voksen-member |
| `unlink_member_device(member_id)` | voksen | `auth_user_id = null` på barnet |
| `complete_task(task_id, member_id)` / `undo_completion(completion_id)` | medlem (se §3) | |
| `get_upcoming_occurrences(household_id, from, to)` | medlem (via RLS) | fremtidige forekomster til årshjulet (se §2) |
| `get_access(household_id)` | medlem | `{ trial_ends_at, is_active }` |

### RLS-tester (pgTAP, `supabase/tests/`)
Minimum før lansering:
1. En bruker i husstand A ser ingen rader fra husstand B, i noen tabell.
2. Et barn kan ikke gjøre insert, update eller delete på `tasks` eller `members`.
3. Et barn kan ikke kalle `complete_task` med et annet medlems ID.
4. En anonym bruker uten medlemskap ser ingenting.
5. Ingen klient kan endre `auth_user_id` eller `trial_ends_at`.
6. `link_tokens` kan ikke leses direkte. Et utløpt eller brukt token avvises.
7. `get_upcoming_occurrences` med en annen husstands ID gir tomt resultat.

Tester for `compute_next_due`: se §2.
