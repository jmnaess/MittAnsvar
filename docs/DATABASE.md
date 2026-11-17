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
    ├──* invites                      feedback_messages (global, les-bare)
    └──* link_tokens                  invite_attempts (per auth-bruker, stengt)
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

### `invites` (invitasjon av voksen, steg 6)
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | |
| code_hash | bytea not null unique | SHA-256 av den normaliserte koden. Klarteksten lagres aldri og kan ikke leses av klienten (ingen kolonnerettighet) |
| created_by | uuid not null → members on delete cascade | forlater den som inviterte, forsvinner invitasjonen |
| created_at | timestamptz not null default now() | |
| expires_at | timestamptz not null | now() + 48 timer |
| used_at | timestamptz null | engangsbruk |
| used_by | uuid null → members on delete set null | den nye voksne |

- **Koden:** 8 tegn fra `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 tegn, uten 0/O/1/I/L), trukket med `gen_random_bytes` uten skjevhet (byte ≥ 248 forkastes). Omtrent 40 bit. Vises som `ABCD-EFGH`.
- **Normalisering:** store bokstaver, og alt utenfor alfabetet fjernes (`private.normalize_invite_code`). Samme regel i `src/features/household/inviteCode.ts`. `abcd efgh` virker derfor.
- **Trekke tilbake = slette raden.** Brukte invitasjoner kan ikke slettes, de er historikk.
- Hvorfor ikke `link_tokens`? Samme mønster (hash, engangsbruk, utløp, RPC), men andre regler: kort kode som skrives for hånd, 48 timer, voksne lister og trekker tilbake, og sperre mot gjetting.

### `invite_attempts` (sperre mot gjetting)
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | bigint identity pk | |
| user_id | uuid not null → auth.users on delete cascade | |
| attempted_at | timestamptz not null default now() | |

Ett feilet `accept_invite`-forsøk = én rad. 5 rader nyere enn 15 minutter gir `too_many_attempts`. Eldre rader slettes av `accept_invite`. Ingen rettigheter og ingen policyer: helt stengt for klienten.

### `link_tokens` (QR for barneenhet, steg 15)
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | |
| member_id | uuid not null → members on delete cascade | barnet som skal kobles |
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
| category | text not null default `other` | check: `daily`, `cleaning`, `kitchen`, `laundry`, `outdoor`, `maintenance`, `safety`, `other`. Skjemaet spør ikke om kategori ennå |
| assigned_member_id | uuid null | null = «hvem som helst». Sammensatt FK `(household_id, assigned_member_id) → members (household_id, id) on delete set null (assigned_member_id)`, så den ansvarlige alltid er i samme husstand |
| template_id | uuid null → task_templates on delete set null | hvilken mal oppgaven ble laget fra (steg 7). Kan settes ved insert, ikke endres |
| *gjentakelse* | se §2 | `recurrence_type`, `recurrence_unit`, `recurrence_every`, `weekdays`, `month_day`, `month`, `anchor_on` |
| next_due_on | date null | neste frist. null = engangsoppgave som er utført. Skrives bare av databasen (trigger og RPC) |
| created_by | uuid null → members on delete set null | settes av triggeren |
| created_at | timestamptz not null default now() | |
| archived_at | timestamptz null | «slettede» oppgaver arkiveres, slik at historikken beholdes |

Indekser: `(household_id, next_due_on) where archived_at is null`, og en **unik** `(household_id, template_id) where archived_at is null and template_id is not null`. Den sørger for at samme mal bare kan være aktiv én gang per husstand. Arkiverte oppgaver teller ikke, så en deaktivert mal kan aktiveres igjen som en ny oppgave.

**Trigger `tasks_set_defaults`** (before insert/update): ved insert settes `anchor_on` = i dag i husstandens tidssone, `created_by` = innlogget medlem og `next_due_on` = `private.first_due(oppgaven)`. Endres gjentakelseskolonnene, settes `anchor_on` til i dag og fristen beregnes på nytt. Klienten har ikke kolonnerettighet til `next_due_on`, `anchor_on` eller `created_by` (kolonnerettigheter sjekker bare kolonnene i selve spørringen, så triggeren kan sette dem).

**View `today_tasks`** (`security_invoker = true`, så RLS på `tasks` gjelder): aktive oppgaver med `next_due_on <= private.household_today(household_id)`. Viewet har tre ekstra kolonner:
- `is_month_task`: oppgaven er en månedsoppgave (se §2).
- `due_by`: siste frist. Det er siste dag i måneden for månedsoppgaver, ellers `next_due_on`.
- `is_overdue`: `due_by < i dag`.

«I dag» regnes dermed aldri ut på mobilen. Appen legger månedsoppgaver som ikke er forfalt, i seksjonen «Denne måneden».

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
| recurrence_every | smallint null (1–100) | – | ✓ «hver N.» | ✓ «N enheter etter» |
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
| Rense takrenner i oktober | calendar, year, every 1, month 10, month_day null (= **månedsoppgave**, se under) |
| Rense sluk 3 mnd etter sist | interval, month, every 3 |
| Bytte batteri i røykvarsler | calendar, year, every 1, month 12, month_day 1 |

**Beregning av neste frist** skjer i databasen, i `private.compute_next_due(p_task public.tasks, p_completed_on date) returns date`. Funksjonen er `language plpgsql immutable` og ligger i schemaet `private`, som ikke eksponeres i API-et:
- `once`: gir `null` (oppgaven er ferdig).
- `interval`: `completed_on + every × unit`. Det er fra *faktisk utført*, uavhengig av fristen. Månedsregning følger Postgres: 31. januar + 1 måned = 28. (eller 29.) februar.
- `calendar`: første forekomst i mønsteret som er **etter** `max(next_due_on, completed_on)`.
  - Gjort tidlig (lørdag, frist søndag): neste frist blir søndagen etter.
  - Gjort sent (mandag): neste frist blir førstkommende søndag. Tapte forekomster hoper seg ikke opp.

Hvorfor i databasen? Regelen finnes ett sted, klienten kan ikke sende en feil frist, og `completed_on` settes uansett av serveren. Funksjonen leser ingen tabeller, så den er lett å teste. Den implementeres som en enkel løkke som går dag for dag til mønsteret treffer. Det er lesbart og raskt nok for MVP.

Hjelpefunksjoner (alle i `private`):
- `matches_pattern(t, d)`: er `d` en forekomst?
- `next_occurrence(t, after)`: første treff etter `after`.
- `first_due(t)`: første frist for en ny oppgave. Det er `anchor_on` for once/interval, og første treff fra og med `anchor_on` for calendar. Månedsoppgaver regnes fra den 1. i måneden til `anchor_on`.
- `is_month_task(t)`, `due_by(t)` og `is_overdue(t, today)`: se under.
- `local_today(tz, at)` og `household_today(hid)`.

### Månedsoppgaver (steg 7)
En årlig kalenderoppgave **uten dag** (`calendar, year, month_day null`) har hele måneden som frist. Formen fantes fra før («i løpet av oktober»), så det trengs ingen ny kolonne.

| | Fast dato: 1. desember | Månedsoppgave: november |
|---|---|---|
| Lagres som | `year, month 12, month_day 1` | `year, month 11, month_day null` |
| `next_due_on` | 2026-12-01 | 2026-11-01 (vinduet åpner) |
| I «I dag» fra | 1. des. | 1. nov., under «Denne måneden» |
| Forfalt fra | 2. des. | 1. des. (`due_by` = 30. nov.) |

- **Aktivert i måneden:** `first_due` gir den 1. i *denne* måneden, så oppgaven vises med en gang. Aktiveres den 17. november, blir fristen november 2026, ikke 2027. Aktivert før måneden gir samme år, aktivert etter gir neste år.
- **Utført:** `compute_next_due` er uendret, og gir første treff etter `max(frist, utført)`. Det er den 1. i samme måned neste år. Det gjelder også ved sen utføring: en desember-oppgave utført 2. januar får frist desember samme år.
- **Angring:** `undo_completion` setter `next_due_on` tilbake til `due_on`, altså den 1. i måneden.
- Skjemaet bruker samme form når «dag» står tom for årlig gjentakelse. Egne oppgaver kan derfor også være månedsoppgaver.

- Uker regnes fra mandagen i uken, ikke ISO-ukenummer, så uke 53 og årsskifte trenger ingen spesialhåndtering.
- Sperren mot evig løkke i `next_occurrence` er `(every + 1) × maks dager per enhet` (uke 7, måned 31, år 366). Med `every ≤ 100` er verste tilfelle omtrent 37 000 dager. Slår sperren til, kastes `recurrence_not_found`. Mangler mønsteret felter, returneres null, slik at check-constrainten avviser raden med 23514.

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

Månedsoppgaver (samme fil, avsnitt 7):
- **Månedsskifte:** november er ikke forfalt 30.11, men forfalt 01.12. Februar i skuddår er ikke forfalt 29.02.
- **Årsskifte:** desember er ikke forfalt 31.12, men forfalt 01.01. Utført 2027-01-02 gir neste frist 2027-12-01.
- **Utføring:** i måneden eller for sent gir samme måned neste år.
- **Første frist:** aktivert i måneden, måneden før, nyttårsaften (desember og januar).
- **Fast dato:** 1. desember er forfalt 2. desember.

Angring, aktivering og `today_tasks` testes i `templates.test.sql` (se §5).

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
| completed_at | timestamptz not null default now() | `complete_task` setter `clock_timestamp()`, så to avkrysninger i samme transaksjon får ulik tid |
| due_on | date null | fristen denne avkrysningen dekket. Brukes til «i tide?» og til angring |
| feedback_message_id | uuid null → feedback_messages on delete set null | hvilken tekst som ble vist, for å unngå gjentakelser |

Indekser: `(task_id, completed_at desc)`, `(household_id, completed_on)` og `(household_id, completed_by_member_id)`. `task_id` og `completed_by_member_id` har sammensatte FK-er med `household_id`, slik at oppgave og medlem alltid hører til samme husstand som raden.

**Skriving skjer bare via RPC** (`security definer`, `set search_path = ''`):

- `complete_task(p_task_id, p_member_id) returns table (completion_id uuid, feedback_text text, next_due_on date)`
  1. Kalleren er medlem av oppgavens husstand, og oppgaven er ikke arkivert. Ellers `task_not_found` (samme feil for andre husstander, så det ikke lekker om id-en finnes). Oppgaveraden låses med `for update`.
  2. `private.household_has_access(household_id)`, ellers feil `subscription_required`.
  3. `p_member_id` hører til samme husstand. Er kalleren et barn, må `p_member_id` være kallerens eget medlem. Ellers `invalid_member`.
  4. `completed_on = (now() at time zone households.timezone)::date`. Klienten sender verken dato eller frist.
  5. Velger en tilbakemeldingstekst (se §4), setter inn raden (`due_on` = oppgavens nåværende `next_due_on`) og setter `tasks.next_due_on = private.compute_next_due(oppgaven, completed_on)`. Alt skjer i én transaksjon.
- `undo_completion(p_completion_id)`: bare den **siste** avkrysningen på en oppgave. Den kan angres av en voksen, eller av den som registrerte den (`recorded_by`), innen 10 minutter. Raden slettes, og `tasks.next_due_on` settes tilbake til `due_on`. Feil: `completion_not_found`, `undo_not_allowed`, `undo_expired`. Appen viser «Angre» i 6 sekunder.

**Historikkspørringer** (vanlig select, ingen egne tabeller):
- Sist utført: `select completed_at from task_completions where task_id = $1 order by completed_at desc limit 1`
- Hvem gjorde hva denne uken: `where household_id = $1 and completed_on >= $2`, gruppert på `completed_by_member_id`.

---

## 4. Maler for årshjulet og tilbakemeldingstekster

Begge er globale tabeller uten `household_id`. Innholdet legges inn via migrasjoner, så det følger med ved `db push`. `supabase/seed.sql` kjøres bare lokalt. Brukere kan bare lese.

### `task_templates` (steg 7)
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| slug | text unique not null | stabil nøkkel, f.eks. `gutters-autumn`. Senere migrasjoner finner malen på slug |
| title | text not null | norsk, 1–80 tegn |
| description | text not null | kort forklaring på norsk, 1–300 tegn. Kopieres til `tasks.description` |
| category | text not null | samme verdier som `tasks.category`. Styrer tilbakemeldingstekstene |
| household_types | household_type[] null | null = alle. Barnemaler: `{family}` |
| housing_types | housing_type[] null | null = alle. «Hus» (eget tak og uteområde) = `{townhouse, house}` |
| *gjentakelse* | samme kolonner og check-constraint som `tasks`, unntatt `anchor_on` | årshjulet: `calendar, year, every 1`, `month`, og `month_day` null (månedsoppgave) eller satt (fast dato) |
| source_url | text null | f.eks. DSB for røykvarsler. Tom til lenkene er sjekket |
| sort_order | smallint not null default 0 | rekkefølge innen måneden |
| is_active | boolean not null default true | maler slettes ikke, de deaktiveres |

Utsatt til steg 9 (forslag i oppstarten): `audience`, `min_age` og `suggested_by_default`. Det planlagte `is_annual_wheel` trengs ikke, fordi årshjulet viser maler med `recurrence_unit = 'year'`.

**Startsett:** 25 maler, 22 i `*_task_templates.sql` og 3 i `*_adjust_task_templates.sql`. Den siste justerer også tre forklaringer, og finner malene på slug. 24 er månedsoppgaver, og røykvarslerne har fast dato 1. desember. Justeringer endrer bare malene. Oppgaver som allerede er aktivert, er kopier og beholder den gamle teksten. Sikkerhetstekstene er generelle og henviser til fagfolk. De må gjennomgås manuelt før lansering, og malene skal utvides til 40–60.

**Aktivering:** RPC `activate_templates(p_household_id, p_template_ids uuid[]) returns int` **kopierer** malene til nye `tasks`-rader med `template_id` satt og returnerer antall nye oppgaver.
- Maler som allerede er aktive, hoppes over (`on conflict do nothing` på den unike indeksen). Samme RPC brukes for én bryter og for «Velg anbefalte».
- Den kjører som `security invoker`. RLS på `tasks` (voksen og `household_has_access`) og triggeren (`anchor_on` = i dag, `first_due`) gjelder dermed som for andre oppgaver.
- Husstanden kan endre kopien fritt, og senere endringer i malen påvirker ikke eksisterende oppgaver.
- **Deaktivering** = arkivere oppgaven (`archived_at`).

Forslag filtreres i TypeScript (`templates/suggest.ts`) på husstandstype og boligtype, og grupperes i tolv måneder med denne måneden først. Barnas alder kommer i steg 9.

### `feedback_messages`
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| tone | text not null | `fact` / `humor` (ikke `both`, det er et filter) |
| text | text not null | «Visste du at …» / «Hvor mange hybelkaniner fant du?» |
| audience | audience not null | |
| template_id | uuid null → task_templates | mest spesifikk. **Ikke laget ennå**, kommer med tekster per mal i steg 11 |
| category | text null | nest mest spesifikk. Er begge null, er teksten generell |
| is_active | boolean not null default true | |

**Utvalg** skjer på serveren, i `complete_task`, som returnerer teksten (endret i steg 5 fra et utvalg på klienten):
1. Filtrer på husstandens tone (`both` = begge) og målgruppen til den som gjorde oppgaven (`any` eller rollen).
2. Bare tekster for oppgavens kategori eller generelle tekster.
3. Sorter: ikke blant de 20 sist viste i husstanden først, deretter kategori foran generell, deretter tilfeldig. Er alle vist nylig, gjentas en tekst.
4. `feedback_message_id` lagres på avkrysningen.

Startsettet (33 tekster) ligger i migrasjonen `*_task_completions.sql` og er justert i `*_adjust_feedback_messages.sql` (36 aktive, 5 deaktivert). Tekster deaktiveres med `is_active = false` i stedet for å slettes, så tidligere avkrysninger beholder koblingen. Det flyttes til `supabase/seed/feedback.sql` og utvides til 80–100 i steg 11.

---

## 5. Row Level Security

### Hjelpefunksjoner (schema `private`, ikke eksponert i API-et)
Alle er `language sql stable security definer set search_path = ''`. Da unngås rekursjon, fordi policyer på `members` ellers ville lest `members` på nytt.

```sql
private.my_household_ids()        returns setof uuid  -- household_id for auth.uid()
private.is_adult(hid uuid)        returns boolean     -- auth.uid() er voksen i hid
private.my_member_id(hid uuid)    returns uuid
private.household_has_access(hid) returns boolean     -- prøvetid eller aktivt abonnement (foreløpig bare prøvetid; abonnement i steg 17)
```

Policyer bruker `household_id in (select private.my_household_ids())`. Innpakningen i `select` gjør at funksjonen evalueres én gang per spørring, ikke én gang per rad.

Merk: Anonyme brukere (barneenheter) har også rollen `authenticated`. Det er trygt, fordi hver policy krever medlemskap via `auth_user_id`.

### Policyer per tabell

| Tabell | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| households | medlem | – (RPC `create_household`) | voksen; kolonner: `name`, `type`, `housing_type`, `feedback_tone` | – (Edge `delete-account`) |
| members | medlem i samme husstand | voksen, bare `role = 'child'` og `auth_user_id is null` | voksen; kolonner: `display_name`, `avatar`, `birth_year` | voksen, bare `role = 'child'` |
| tasks | medlem | voksen **og** `household_has_access` | voksen (inkl. arkivering via `archived_at`) | – (arkiver i stedet) |
| today_tasks (view) | medlem (via RLS på tasks) | – | – | – |
| task_completions | medlem | – (RPC `complete_task`) | – | – (RPC `undo_completion`) |
| invites | voksen i husstanden; alle kolonner unntatt `code_hash` | – (RPC `create_invite`) | – (RPC `accept_invite`) | voksen, bare `used_at is null` (= trekke tilbake) |
| invite_attempts | – | – (RPC) | – | – |
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
Alle RPC-er er `security definer` og `set search_path = ''`, unntatt `get_upcoming_occurrences` og `activate_templates`, som kjører som `security invoker` (RLS gjelder). `execute` er revoked fra `anon` og `public` og granted til `authenticated`.

| Funksjon | Hvem | Gjør |
|----------|------|------|
| `create_household(p_name, p_type, p_housing_type, p_display_name, p_avatar) returns uuid` | innlogget, ikke-anonym, uten husstand | household + voksen-member i én transaksjon, `trial_ends_at = now() + 14 d`. Feil (errcode `P0001`, nøkkel som melding): `not_authenticated`, `anonymous_not_allowed`, `already_in_household` |
| `create_invite(p_household_id) returns table (code, expires_at)` | voksen, `household_has_access` | lager kode (8 tegn, 48 t, engangs), lagrer hash, returnerer klartekst bare her. Feil: `not_authenticated`, `not_adult` (barn, anonym, annen husstand), `subscription_required` |
| `accept_invite(p_code, p_display_name, p_avatar) returns uuid` | innlogget, ikke-anonym, uten husstand | normaliserer koden, legger til voksen-member og markerer invitasjonen brukt i én transaksjon. Returnerer husstandens id. Feil: `not_authenticated`, `anonymous_not_allowed`, `already_in_household`, `too_many_attempts`. **Feil, utløpt, brukt eller tilbaketrukket kode gir `null`**, som appen gjør om til `invite_invalid`. Grunnen: en kastet feil ruller tilbake hele transaksjonen, også raden i `invite_attempts`, og da ville sperren aldri slått inn. `pg_advisory_xact_lock` per bruker hindrer at parallelle kall sniker seg forbi sperren |
| `create_link_token(member_id)` | voksen | returnerer råtoken, lagrer hash |
| `redeem_link_token(token)` | anonym innlogget (barnets enhet) | kobler `auth_user_id` til barnet |
| `unlink_member_device(member_id)` | voksen | `auth_user_id = null` på barnet |
| `complete_task(task_id, member_id)` / `undo_completion(completion_id)` | medlem (se §3) | avkrysning med neste frist og tilbakemelding / angring |
| `activate_templates(p_household_id, p_template_ids) returns int` | voksen, `household_has_access` (via RLS på `tasks`) | kopierer maler til oppgaver, hopper over aktive og inaktive maler, returnerer antall nye. Feil: `42501` (barn, annen husstand, utløpt prøvetid) |
| `get_upcoming_occurrences(household_id, from, to)` | medlem (via RLS) | fremtidige forekomster til årshjulet (se §2) |
| `get_access(household_id)` | medlem | `{ trial_ends_at, is_active }` |
| `delete_my_account_data()` | innlogget (kalles av Edge `delete-account`) | ingen parametere, bruker `auth.uid()`. Siste voksne: sletter husstanden (cascade). Andre voksne finnes: sletter bare egen `members`-rad. Barn/uten medlemskap: ingenting. Låser husstandsraden (`for update`) før voksne telles |

### RLS-tester (pgTAP, `supabase/tests/`)
Minimum før lansering:
1. En bruker i husstand A ser ingen rader fra husstand B, i noen tabell.
2. Et barn kan ikke gjøre insert, update eller delete på `tasks` eller `members`.
3. Et barn kan ikke kalle `complete_task` med et annet medlems ID.
4. En anonym bruker uten medlemskap ser ingenting.
5. Ingen klient kan endre `auth_user_id` eller `trial_ends_at`.
6. `link_tokens` kan ikke leses direkte. Et utløpt eller brukt token avvises.
7. `get_upcoming_occurrences` med en annen husstands ID gir tomt resultat.
8. `delete_my_account_data` (`delete_account.test.sql`): siste voksne sletter hele husstanden, med flere voksne slettes bare egen rad, barnets enhet og brukere uten medlemskap sletter ingenting, og andre husstander røres ikke.

9. Invitasjoner (`invites.test.sql`): riktig kode virker (også med små bokstaver, mellomrom og bindestrek), koden virker én gang, utløpt og tilbaketrukket kode avvises, feil kode gir `invite_invalid` og lagres som forsøk, sperre etter 5 forsøk (også for riktig kode) som slipper etter 15 minutter, bruker med husstand og anonym avvises, barn, anonyme og andre husstander kan ikke lage invitasjoner, ingen ser invitasjoner i en annen husstand, hashen kan ikke leses, og den nye voksne ser oppgavene og kan krysse av.

10. Maler og månedsoppgaver (`templates.test.sql`):
    - Maler kan leses, men ikke skrives, og anon ser ingenting. Startsettet har 25 maler, justerte forklaringer er lagt inn, og inaktive maler vises ikke.
    - Aktivering kopierer feltene. Samme mal blir bare én oppgave, og direkte duplikat gir 23505. En arkivert mal kan aktiveres igjen.
    - Barn, en annen husstand, utløpt prøvetid og brukere uten medlemskap avvises.
    - En mal for denne måneden står i `today_tasks` som månedsoppgave og er ikke forfalt. En fra forrige måned er forfalt.
    - Utføring gir samme måned neste år og kjøkkenteksten. Angring gir den 1. i måneden tilbake, og oppgaven er ikke forfalt.

Tester for `compute_next_due` og månedsoppgaver med faste datoer: se §2.
