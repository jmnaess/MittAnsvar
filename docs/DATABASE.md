# MittAnsvar – database

Postgres i Supabase (EU). Tabell- og kolonnenavn er på engelsk, innholdstekster på norsk.
Alle tabeller i `public` har RLS på. Bakgrunn og flyt: se [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Tabeller, kolonner og relasjoner

```
auth.users ─┐ (0..1)
            ▼
households 1──* members 1──* task_completions *──1 tasks *──1 households
    │  1           │     (assigned_member_id)──────────┘ │
    │  │           └──* payouts                          └──0..1 task_templates
    │  └──1 household_subscriptions
    ├──* invites                      feedback_messages (global, les-bare)
    ├──* household_displays           invite_attempts, link_attempts (per auth-bruker, stengt)
    └──* link_tokens

View: today_tasks (tasks), today_completions (task_completions + tasks), recent_completions (task_completions + tasks), member_balances (members + task_completions + payouts)
```

### Enum-typer
| Type | Verdier |
|------|---------|
| `household_type` | `single`, `couple`, `family` |
| `housing_type` | `apartment`, `townhouse`, `house` |
| `feedback_tone` | `fact`, `humor`, `both` |
| `member_role` | `adult`, `child` |
| `audience` | `adult`, `child`, `any` |
| `recurrence_type` | `once`, `calendar`, `interval`, `job` (steg 9, egen migrasjon fordi en ny enum-verdi ikke kan brukes i samme transaksjon) |
| `recurrence_unit` | `day`, `week`, `month`, `year` |
| `completion_status` | `pending`, `approved`, `rejected` (steg 10b) |
| `sewage_type` | `municipal`, `septic_tank`, `mini_treatment_plant` (hjemprofil) |
| `avatar_mode` | `figure`, `photo` (profilbilder) |

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
| has_garden, has_car, has_cabin, has_air_heat_pump, has_fireplace, has_balanced_ventilation, has_hydronic_heating, has_private_well | boolean null | **hjemprofil**. `null` = ikke svart |
| sewage_type | sewage_type null | hjemprofil: avløp. `null` = ikke svart |

**Hjemprofil:** spørsmål om boligen som styrer forslag i årshjulet (via `task_templates.requires`, §4). Boligtype er `housing_type`. Profilen ligger som kolonner på `households` (én per husstand), så RLS er som for resten av husstanden: alle medlemmer leser, voksne endrer. Et ubesvart spørsmål oppfyller aldri en betingelse.

### `members`
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households **on delete cascade** | |
| role | member_role not null | |
| display_name | text not null | 1–30 tegn, fornavn/kallenavn |
| avatar | text not null | nøkkel til innebygd illustrasjon, f.eks. `fox`. Styrer også personens farger, også når bildet vises |
| avatar_mode | avatar_mode not null default `figure` | `photo` = vis profilbildet i stedet for figuren |
| photo_path | text null | sti i bøtta `member-photos`, `{household_id}/{id}/{uuid}.jpg` (se §6) |
| birth_year | smallint null | bare for barn, brukes til alderstilpassede forslag |
| auth_user_id | uuid null **unique** → auth.users on delete set null | voksen: e-postbruker; barn: anonym bruker på egen enhet (steg 10a), ellers null. Ett barn har høyst én enhet |
| created_at | timestamptz not null default now() | |

- Check: `role = 'adult'` ⇒ `birth_year is null`.
- Check: `photo_path` er `null` eller ligger i medlemmets egen mappe (`members_photo_path_own_folder`).
- Check: `avatar_mode = 'photo'` ⇒ `photo_path is not null` (`members_photo_mode_needs_photo`). Fjernes bildet, settes modus til `figure` i samme update.
- `unique(auth_user_id)` betyr én husstand per bruker i MVP. Fjernes constrainten senere, tillates flere husstander.
- `on delete set null` (ikke cascade): hvis barnets anonyme bruker slettes, skal barneprofilen bestå. `delete-account` sletter den voksnes `members`-rad eksplisitt.
- Barnets anonyme bruker slettes ved frakobling (`unlink_member_device`) og når husstanden slettes (`delete_my_account_data`). Begge bruker `private.delete_anonymous_users`, som bare sletter brukere med `is_anonymous`. Anonyme brukere som aldri ble koblet, slettes av en timesjobb etter 24 timer (§5, «Opprydding av anonyme brukere»).

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

### `link_tokens` (kode for barnets enhet, steg 10a)
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | |
| member_id | uuid null → members on delete cascade | barnet som skal kobles. `null` = kode for en familieskjerm |
| code_hash | bytea not null unique | SHA-256 av den normaliserte koden. Klarteksten lagres aldri |
| created_by | uuid not null → members on delete cascade | |
| created_at | timestamptz not null default now() | |
| expires_at | timestamptz not null | now() + 10 min |
| used_at | timestamptz null | engangsbruk |

- **Én kort kode** på 8 tegn, samme alfabet, generator og normalisering som `invites` (`private.generate_invite_code`, `private.hash_invite_code`). QR-koden inneholder den samme koden (`mittansvar://link?code=ABCDEFGH`), så skann og inntasting er samme vei. Planen var et token på 32 byte i QR-koden. Det ble endret i steg 10, fordi en kort kode som også kan tastes inn, er trygg nok når den bare gjelder i 10 minutter og har sperre mot gjetting.
- Bare den nyeste koden per barn gjelder: `create_link_token` sletter barnets ubrukte koder. Det samme gjelder skjermkoder per husstand (`create_display_link_token`).
- Helt stengt for klienten (ingen rettigheter, ingen policyer).

### `household_displays` (familieskjermer)
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | |
| auth_user_id | uuid not null **unique** → auth.users on delete cascade | skjermens anonyme bruker. Kan ikke leses av klienten |
| created_by | uuid null → members on delete set null | skjermen virker videre når den voksne sletter kontoen sin |
| created_at | timestamptz not null default now() | |

Skjermen er **ikke** et medlem. Alle innloggede er rollen `authenticated`, så kolonnerettigheter kan ikke skille den fra andre, og en leserett via RLS ville også gitt fødselsår, hjemprofil og all historikk. Uten rad i `members` er alle policyer stengt, og den leser bare via `get_family_board`. Voksne i husstanden kan lese `id`, `household_id` og `created_at`.

### `link_attempts` (sperre mot gjetting av koden)
Som `invite_attempts`: ett feilet `redeem_link_token`-forsøk = én rad, 5 rader nyere enn 15 minutter gir `too_many_attempts`. Helt stengt for klienten. Anonyme innlogginger er i tillegg begrenset per IP i Supabase Auth (standard 30 per time), og ukoblede anonyme brukere slettes etter 24 timer (§5).

### `tasks`
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | |
| title | text not null | 1–80 tegn |
| description | text null | |
| category | text not null default `other` | check, i fast rekkefølge: `kitchen` (Kjøkken), `tidying` (Rydding og rom), `laundry` (Klesvask), `outdoor` (Ute og hage), `car` (Bil), `pets` (Kjæledyr), `maintenance` (Vedlikehold), `other` (Annet). Velges i skjemaene, grupperer «Oppgaver». Mappingen fra de gamle verdiene står i `*_task_categories.sql` |
| assigned_member_id | uuid null | null = «hvem som helst». Sammensatt FK `(household_id, assigned_member_id) → members (household_id, id) on delete set null (assigned_member_id)`, så den ansvarlige alltid er i samme husstand. Alltid null for jobber (check `tasks_job_no_assignee`) |
| template_id | uuid null → task_templates on delete set null | hvilken mal oppgaven ble laget fra (steg 7). Kan settes ved insert, ikke endres |
| *gjentakelse* | se §2 | `recurrence_type`, `recurrence_unit`, `recurrence_every`, `weekdays`, `month_day`, `month`, `anchor_on` |
| season_start_month, season_end_month | smallint null (1–12) | aktiv periode (sesong), se §2 Sesong. Begge null = hele året |
| next_due_on | date null | neste frist. null = engangsoppgave som er utført, eller en jobb (har aldri frist). Skrives bare av databasen (trigger og RPC) |
| postponed_from | date null | «Utsett til»: fristen før utsettelsen, til «Angre». Bare RPC-ene `postpone_task`/`undo_postpone` skriver den (ingen kolonnerettighet). Se §2 Utsettelse |
| postponed_to | date null | datoen oppgaven ble utsatt til. Oppgaven er utsatt så lenge `postponed_to = next_due_on` (`private.is_postponed`). Check: begge eller ingen er satt |
| once_on | date null | datoen en engangsoppgave skal gjøres («I dag», «I morgen», «Velg dato»). null = i dag (eldre oppgaver). Bare for `once` (check-constraint). Klienten skriver den; triggeren flytter en passert dato til i dag og gir ny frist bare når den endres |
| reward_nok | integer null | lønn i hele kroner, 1–10 000 (steg 9). null = ingen lønn. Bare voksne kan sette den (RLS) |
| job_repeats | boolean not null default false | bare for jobber: false = engangsjobb, true = kan gjøres igjen. Check: `job_repeats ⇒ recurrence_type = 'job'` |
| job_member_ids | uuid[] not null default `'{}'` | bare for jobber: barna som kan ta jobben. Tom = alle barna. Check: `'{}'` eller `recurrence_type = 'job'`. En liste kan ikke ha FK, så triggeren `tasks_check_job_members` avviser alt som ikke er barn i samme husstand, og duplikater (`invalid_member`). Triggeren `members_remove_from_jobs` fjerner et barn som slettes |
| created_by | uuid null → members on delete set null | settes av triggeren |
| created_at | timestamptz not null default now() | |
| archived_at | timestamptz null | «slettede» oppgaver arkiveres, slik at historikken beholdes |

Indekser: `(household_id, next_due_on) where archived_at is null`, og en **unik** `(household_id, template_id, assigned_member_id) nulls not distinct where archived_at is null and template_id is not null` (`tasks_household_template_member_key`, steg 16). Samme barnemal kan dermed være aktiv én gang per barn. Andre maler er bare aktive én gang per husstand, uansett hvem oppgaven er tildelt: det sjekker `activate_templates`. Arkiverte oppgaver teller ikke, så en deaktivert mal kan aktiveres igjen som en ny oppgave.

**Trigger `tasks_set_defaults`** (before insert/update): ved insert settes `anchor_on` = i dag i husstandens tidssone, `created_by` = innlogget medlem og `next_due_on` = `private.first_due(oppgaven)`. Endres gjentakelseskolonnene (også `once_on` og periodekolonnene), settes `anchor_on` til i dag og fristen beregnes på nytt. Klienten har ikke kolonnerettighet til `next_due_on`, `anchor_on` eller `created_by` (kolonnerettigheter sjekker bare kolonnene i selve spørringen, så triggeren kan sette dem).

**View `today_tasks`** (`security_invoker = true`, så RLS på `tasks` gjelder): aktive oppgaver med `next_due_on <= private.household_today(household_id)`, og alle aktive jobber (steg 9). En daglig oppgave (`private.is_daily`, se under) vises bare på dager den skal gjøres (`matches_pattern`) eller på datoen den er utsatt til, så en man–fre-oppgave fra fredag står ikke i «I dag» i helgen. Viewet har tre ekstra kolonner:
- `is_month_task`: oppgaven er en månedsoppgave (se §2), og ikke utsatt.
- `due_by`: siste frist. Det er siste dag i måneden for månedsoppgaver, ellers `next_due_on`. En utsatt månedsoppgave har `next_due_on` som frist.
- `is_overdue`: `due_by < i dag`. Alltid `false` for jobber (`coalesce`), fordi de ikke har frist, og for daglige oppgaver.

**Daglige oppgaver blir aldri forfalt** (`20261123100000_daily_never_overdue.sql`). Daglig (`private.is_daily`, i appen `isDailyRecurrence`) er hver dag (fast kalender eller 1 dag etter sist), eller hver uke på minst alle hverdagene. En glemt daglig oppgave starter bare på nytt: `next_due_on` blir stående på den glemte dagen, men `is_overdue` er `false`, og avkrysning gir riktig neste frist fordi `compute_next_due` bruker `greatest(next_due_on, completed_on)`. Ukentlige og sjeldnere oppgaver kan fortsatt bli forfalt.

«I dag» regnes dermed aldri ut på mobilen. Appen legger månedsoppgaver som ikke er forfalt, i seksjonen «Denne måneden», og jobber i «Ekstrajobber».

**View `today_completions`** (`security_invoker = true`, så RLS på `task_completions` og `tasks` gjelder): dagens avkrysninger (`completed_on = private.household_today(household_id)`), uten avviste. Med tittel, `assigned_member_id`, `recurrence_type` og `job_member_ids` (hvem en jobb kan flyttes til) fra oppgaven, også når oppgaven er arkivert (en ledig jobb som er gjort). `is_latest`: ingen nyere avkrysning på samme oppgave, samme regel som `undo_completion`. «I dag» viser radene som utført nederst i hvert kort. Appen angrer ved trykk bare når `is_latest`, innen 10 minutter, og for barn bare det de selv registrerte (`recorded_by`); serveren sjekker det samme i `undo_completion`. Voksne kan i tillegg rette hele dagen: trykk på sirkelen gir «Merke som ikke gjort?» (`remove_completion`), trykk på raden gir «Endre hvem som gjorde det» (`reassign_completion`), og langt trykk gir valg mellom «Ikke gjort» og «Endre hvem som gjorde det». Testes i `today_completions.test.sql`.

**View `recent_completions`** (`security_invoker = true`, som `today_completions`): avkrysninger fra i går til og med tre dager siden (`completed_on between household_today - 3 and household_today - 1`), uten avviste. Med tittel og `recurrence_type` fra oppgaven, også når den er arkivert. Brukes i personvisningen i «I dag» («Gjort siste 3 dager»), der appen filtrerer på `completed_by_member_id` og grupperer per dag. RLS på `task_completions` gjør at barn bare ser sin egen historikk, så viewet trenger ingen security definer. «Kommende» i samme visning bruker `get_upcoming_occurrences` (8 uker for voksne, 2 uker på barnets enhet). Testes i `recent_completions.test.sql`.

### `payouts` (utbetalinger, steg 9)
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | |
| member_id | uuid not null | barnet. Sammensatt FK `(household_id, member_id) → members on delete cascade`, så utbetalingen slettes med barneprofilen (GDPR) |
| amount_nok | integer not null | > 0, hele kroner |
| paid_at | timestamptz not null default now() | |
| recorded_by_member_id | uuid null → members on delete set null | den voksne som registrerte |

Indeks `(household_id, member_id, paid_at desc)`. Skrives bare via RPC-en `record_payout` (se §5).

**View `member_balances`** (`security_invoker = true`): én rad per barn (et barn ser bare sin egen rad, steg 10a) med `member_id`, `household_id`, `earned_nok` (sum av godkjente `task_completions.reward_nok`), `pending_nok` (sum av ventende, steg 10b), `paid_nok` (sum av `payouts.amount_nok`) og `balance_nok = earned_nok − paid_nok` (det som kan betales ut). Avviste beløp teller ikke. Appen viser `balance_nok + pending_nok` med det som venter i parentes: «35 kr (10 kr venter)» (`rewards/format.ts`). Saldoen lagres ikke, så den kan aldri komme ut av takt med historikken. RLS på de underliggende tabellene gjelder.

Kjent kanttilfelle: en utbetaling, og så en angring innen 10 minutter, kan gi negativ saldo. Det godtas.

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

| Kolonne | Type | `once` | `calendar` | `interval` | `job` |
|---------|------|--------|------------|------------|-------|
| recurrence_type | recurrence_type not null | ✓ | ✓ | ✓ | ✓ |
| recurrence_unit | recurrence_unit null | – | ✓ | ✓ | – |
| recurrence_every | smallint null (1–100) | – | ✓ «hver N.» | ✓ «N enheter etter» | – |
| weekdays | smallint[] null (ISO 1=man … 7=søn) | – | påkrevd når unit = `week` | – | – |
| month_day | smallint null (1–31) | – | påkrevd når unit = `month`, valgfri når unit = `year` | – | – |
| month | smallint null (1–12) | – | påkrevd når unit = `year` | – | – |
| anchor_on | date not null | frist | startdato (for «annenhver uke») | første frist | (brukes ikke) |
| job_repeats | boolean not null | false | false | false | engangs- eller gjentakende jobb |
| season_start_month, season_end_month | smallint null (1–12) | – | valgfri, ikke når unit = `year` | valgfri | – |

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
| Henge opp vask (ekstrajobb, én gang) | job, job_repeats false |
| Tømme oppvaskmaskinen (ekstrajobb, igjen og igjen) | job, job_repeats true |
| Rydde boden (ekstrajobb for Leah og Ola) | job, job_member_ids `{leah, ola}` |
| Klippe plenen, mai–sep | interval, week, every 1, season 5–9 |
| Rense varmepumpefilter, okt–apr | interval, week, every 8, season 10–4 |

### Ekstrajobber (steg 9)
En jobb er en oppgave **uten dato**. Den minste endringen var én ny enum-verdi og én boolsk kolonne:
- Ingen gjentakelseskolonner (som `once`). `first_due` og `compute_next_due` gir `null`, så `next_due_on` er alltid `null`.
- Derfor er jobber automatisk utenfor `get_upcoming_occurrences` (som hopper over `next_due_on null`), påminnelsene og årshjulet. De blir heller aldri forfalt.
- **Engangsjobb** (`job_repeats = false`): `complete_task` setter `archived_at`, og `undo_completion` fjerner den igjen. **Gjentakende jobb**: blir stående og kan krysses av så ofte man vil.
- **For hvem:** `job_member_ids` er barna som kan ta jobben. Tom liste = alle barna. Jobber bruker aldri `assigned_member_id`. Jobber for ett barn fra før steg 9 ble flyttet over til listen i migrasjonen `job_members`.
- En liste i stedet for en koblingstabell: jobben lagres i ett kall og følger med i `today_tasks`. Prisen er at innholdet sjekkes av en trigger i stedet for en FK.
- Fra steg 10a hindrer databasen at et barn på egen enhet krysser av en jobb for andre barn, eller en oppgave tildelt et søsken (`complete_task`, `invalid_member`). En voksen kan fortsatt registrere for hvem som helst.

**Beregning av neste frist** skjer i databasen, i `private.compute_next_due(p_task public.tasks, p_completed_on date) returns date`. Funksjonen er `language plpgsql immutable` og ligger i schemaet `private`, som ikke eksponeres i API-et:
- `once`: gir `null` (oppgaven er ferdig). `job` gir også `null` (har aldri frist).
- `interval`: `completed_on + every × unit`. Det er fra *faktisk utført*, uavhengig av fristen. Månedsregning følger Postgres: 31. januar + 1 måned = 28. (eller 29.) februar. Med periode: havner datoen utenfor, blir fristen den 1. i periodens første måned (se Sesong).
- `calendar`: første forekomst i mønsteret som er **etter** `max(next_due_on, completed_on)`.
  - Gjort tidlig (lørdag, frist søndag): neste frist blir søndagen etter.
  - Gjort sent (mandag): neste frist blir førstkommende søndag. Tapte forekomster hoper seg ikke opp.

Hvorfor i databasen? Regelen finnes ett sted, klienten kan ikke sende en feil frist, og `completed_on` settes uansett av serveren. Funksjonen leser ingen tabeller, så den er lett å teste. Den implementeres som en enkel løkke som går dag for dag til mønsteret treffer. Det er lesbart og raskt nok for MVP.

Hjelpefunksjoner (alle i `private`):
- `matches_pattern(t, d)`: er `d` en forekomst?
- `next_occurrence(t, after)`: første treff etter `after`.
- `first_due(t)`: første frist for en ny oppgave. Det er `once_on` (eller `anchor_on` uten dato) for once, `anchor_on` for interval (eller periodens start), og første treff fra og med `anchor_on` for calendar. Månedsoppgaver regnes fra den 1. i måneden til `anchor_on`.
- `in_season(t, d)`, `season_start_on_or_after(t, d)`, `season_gap_after(t, d)`, `season_resume(t, today)`: perioden, se Sesong.
- `is_month_task(t)`, `due_by(t)` og `is_overdue(t, today)`: se under.
- `local_today(tz, at)` og `household_today(hid)`.

### Utsettelse («Utsett til»)
En voksen trykker på raden til en åpen oppgave i «I dag», eller på nærmeste forekomst i «Kommende» (sirkelen krysser av), og velger neste dag, Til helga eller en dato. Bare denne forekomsten flyttes. I «Kommende» gjelder samme regel som for tidlig avkrysning (`canCompleteEarly`), så daglige oppgaver er ikke med.

- **Modell: én åpen forekomst om gangen.** `postpone_task` flytter `next_due_on` til den nye datoen og husker den gamle i `postponed_from`. Gjentakelseskolonnene røres ikke. Engangsoppgaver får også ny `once_on`, så skjemaet viser riktig dato.
- **Mønsteret fortsetter:** `compute_next_due` tar `max(frist, utført)` for kalender og regner fra utført for intervall. En søndagsoppgave utsatt til onsdag får neste frist søndagen etter.
- **Forekomster imellom hoppes over**, som når en oppgave gjøres for sent. En daglig oppgave utsatt fra onsdag til lørdag vises ikke torsdag og fredag. Valgt fordi det er enkelt og likt resten av appen.
- **Aldri dobbel visning:** det finnes bare én `next_due_on`. Utsatt til en dag der oppgaven uansett skal gjøres, vises den én gang, og neste frist blir neste forekomst etter det.
- **Utsatt** = `postponed_to = next_due_on`. Ved avkrysning får oppgaven ny frist, og utsettelsen slutter å gjelde av seg selv. Angres avkrysningen, settes fristen tilbake til den utsatte datoen, og den er utsatt igjen. `complete_task` og angring er derfor uendret.
- **Månedsoppgaver:** en utsatt månedsoppgave er en fast dato (`due_by` = `next_due_on`, `today_tasks.is_month_task` = false, «Neste frist» viser dagen). Neste gang er det samme måned neste år.
- **Redigering:** endres gjentakelsen eller `once_on` på vanlig måte, nullstiller triggeren `postponed_*`.
- **«I dag»** viser den ikke før den nye datoen. **Påminnelser** og andre som bruker `get_upcoming_occurrences` får den utsatte datoen og så det vanlige mønsteret, uten endring i funksjonen. Appen planlegger påminnelsene på nytt fordi mutasjonen invaliderer `['tasks', householdId]`. **Årshjulet** grupperer på `month` fra gjentakelsen, så oppgaven står i samme måned.
- **Fram i tid:** ny dato må være etter både i dag og fristen. En oppgave som allerede er utsatt, kan utsettes igjen, og «Angre» går da ett steg tilbake. Trykker en voksen «Ikke gjort» på dagens avkrysning etter å ha utsatt neste forekomst, går fristen tilbake til i dag og utsettelsen gjelder ikke lenger.
- Jobber kan ikke utsettes.
- «Til helga» regnes i `src/features/tasks/postpone.ts`: førstkommende lørdag, søndag hvis det er lørdag, neste lørdag hvis det er søndag. På fredag er det samme dag som «I morgen», og bare «I morgen» vises.

### Sesong (aktiv periode)
En gjentakende oppgave kan begrenses til en del av året: «Klipp plenen, mai–sep», «Rens varmepumpefilteret, okt–apr». Migrasjon `*_seasonal_tasks.sql`.

- **Kolonner:** `season_start_month` og `season_end_month` (1–12) på `tasks` og `task_templates`. Hele måneder. Start > slutt = over nyttår. Start = slutt = én måned. Check `tasks_season_valid`: begge eller ingen, og bare for `interval` og `calendar` med unit ≠ `year`. Engangsoppgaver, jobber og årlige oppgaver har allerede en dato eller måned. Klienten sender ingen periode når alle tolv måneder er valgt.
- **Utenfor perioden finnes ingen forekomster.** `matches_pattern` krever `in_season(t, d)`, så `next_occurrence`, `first_due`, `compute_next_due` og `get_upcoming_occurrences` følger med for kalenderoppgaver uten flere endringer. Sperren i `next_occurrence` får 366 dager ekstra med periode. «Annenhver uke» teller fortsatt fra `anchor_on`, også over vinteren.
- **Intervall:** `compute_next_due` = `season_start_on_or_after(t, utført + intervall)`. Rens 20. mars + 8 uker = 15. mai → 1. oktober. Første frist (`first_due`) er i dag eller periodens start. Intervallmaler (ett intervall frem) går via `compute_next_due` og følger med.
- **Ny periode = ny gjentakelse:** triggeren regner ut ny frist fra i dag når periodekolonnene endres.
- **Forfalt når perioden slutter:** en oppgave som ikke er gjort når perioden er over, skal ikke stå forfalt hele vinteren. `private.roll_over_seasons(p_now default now())` flytter aktive oppgaver der `season_gap_after(t, next_due_on) <= i dag` (perioden har sluttet etter fristen) til `season_resume(t, i dag)`: første forekomst i neste periode, eller fra i dag hvis jobben ikke har kjørt på lenge. `postponed_*` nullstilles. Ingen avkrysning lagres, så historikken viser at den ikke ble gjort. Den kjøres hver time av pg_cron (`cron.job` `roll-over-seasons`, minutt 5), fordi husstander kan ha ulik tidssone. Etter midnatt kan oppgaven altså stå i opptil en time. Innloggede kan ikke kjøre funksjonen. `next_due_on` er dermed alltid riktig lagret, og «I dag», Oppgaver, «Kommende» og påminnelser trenger ingen egen regel.
- **Utsatt til en dato utenfor perioden:** tillatt, og datoen respekteres (`postpone_task` er uendret). Gjøres den, gir `compute_next_due` første forekomst i neste periode. Gjøres den ikke, ruller jobben den dagen etter.
- **Klient:** «Bare deler av året» under «Gjentas» (ikke for årlig), med fra–til måned. Teksten blir «Hver lørdag · mai–sep» / «8 uker etter sist · okt–apr» (`describeRecurrence`, `formatSeason`). Hintet sier «Første gang er 1. mai» når denne måneden er utenfor (`repeatHint`).
- **Årshjulet:** sesongmaler og egne sesongoppgaver vises én gang, i periodens første måned (`yearWheelMonth` i `templates/suggest.ts`).
- **Maler:** `heat-pump-filter` har okt–apr. `ventilation-filter` har ingen periode (anlegget går hele året). Nye: `lawn-mow` (1 uke etter sist, mai–sep) og `weed-beds` (2 uker etter sist, mai–aug), begge `{"has_garden": true}`. Aktiverte oppgaver er kopier og fikk ikke perioden.
- **Tester:** `supabase/tests/seasonal_tasks.test.sql` (periode innenfor ett år, over nyttår, én måned, hopp til neste periode, intervall over periodeslutt, forfalt ved periodeslutt, utsettelse utenfor perioden, «Kommende», check-constraint, trigger, aktivering, rettigheter og jobben) og `src/features/tasks/__tests__/season.test.ts`.

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

**Fremtidige forekomster** hentes med RPC-en `get_upcoming_occurrences(p_household_id uuid, p_from date, p_to date) returns table (task_id uuid, due_on date)`. Den er laget i steg 8 for påminnelser (ARCHITECTURE.md §9), og årshjulet bruker den i steg 11:
- Starter på `next_due_on` for hver aktiv oppgave og kaller `compute_next_due` gjentatte ganger, som om hver forekomst blir utført på fristen.
- En forfalt kalenderoppgave spoles fram til første forekomst fra og med `p_from` (`next_occurrence(t, p_from - 1)`). Den forfalte forekomsten selv er ikke med. Utførte engangsoppgaver (`next_due_on` null) og arkiverte oppgaver er ikke med.
- Filtrerer **ikke** på enhet, fordi påminnelser trenger daglige og ukentlige rutiner. Årshjulet tar selv bare med `month`, `year` og engangsoppgaver, så daglige rutiner ikke drukner det.
- Maks ett år (`p_to - p_from <= 366`). Ellers, eller hvis `p_to < p_from`, kastes `invalid_window` (22023).
- Testet i `supabase/tests/upcoming_occurrences.test.sql`: ukentlig, årsskifte, månedsoppgave, forfalt som spoles fram, intervall, engangsoppgave, arkivert, RLS og ugyldig vindu.
- Er `stable` og `security invoker`. RLS på `tasks` gjelder dermed som vanlig, og funksjonen trenger ingen egne tilgangssjekker.

**Hvorfor ikke RRULE (iCal)?** Det er kraftig, men vanskelig å validere og vise i UI. De sju kolonnene dekker alle behovene i MVP og kan konverteres til RRULE senere.

---

## 3. `task_completions` og historikk

Hver avkrysning blir en ny rad. Tabellen er nesten append-only: bare `status` kan endres (steg 10b, via `approve_completions`, `reject_completion` og `set_completion_status`), `reassign_completion` kan flytte dagens avkrysning til en annen person (`completed_by_member_id`, `reward_nok`, `status`, `recorded_by`), og raden slettes bare ved «angre» og «Ikke gjort» (`undo_completion`, `remove_completion`).

| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| household_id | uuid not null → households on delete cascade | denormalisert for enkel RLS |
| task_id | uuid not null → tasks on delete cascade | |
| completed_by_member_id | uuid not null → members **on delete cascade** | hvem som gjorde det. Slettes med barneprofilen (GDPR) |
| recorded_by | uuid null → auth.users on delete set null | hvilken innlogget bruker som registrerte (på familieskjermen: skjermens anonyme bruker, `null` etter frakobling) |
| completed_on | date not null | lokal dato i husstandens tidssone, **settes av serveren** |
| completed_at | timestamptz not null default now() | `complete_task` setter `clock_timestamp()`, så to avkrysninger i samme transaksjon får ulik tid |
| due_on | date null | fristen denne avkrysningen dekket. Brukes til «i tide?» og til angring |
| feedback_message_id | uuid null → feedback_messages on delete set null | hvilken tekst som ble vist, for å unngå gjentakelser |
| reward_nok | integer null | lønnen som ble tjent (steg 9), kopiert fra `tasks.reward_nok`. null = ingen lønn, eller en voksen gjorde oppgaven. Senere prisendring påvirker ikke raden |
| status | completion_status not null default `approved` | steg 10b. `pending` når et barn krysser av en oppgave med lønn på sin egen enhet, eller det skjer på familieskjermen. Alt annet (uten lønn, eller registrert av en voksen, også for et barn) er `approved` med én gang. `rejected` = ikke godkjent: beløpet teller ikke, og oppgaven regnes som ikke gjort. Raden beholdes, så barnet ser det. Delvis indeks `(household_id) where status = 'pending'` |

Indekser: `(task_id, completed_at desc)`, `(household_id, completed_on)` og `(household_id, completed_by_member_id)`. `task_id` og `completed_by_member_id` har sammensatte FK-er med `household_id`, slik at oppgave og medlem alltid hører til samme husstand som raden.

**Skriving skjer bare via RPC** (`security definer`, `set search_path = ''`):

- `complete_task(p_task_id, p_member_id, p_last_today default false) returns table (completion_id uuid, feedback_text text, next_due_on date, reward_nok integer, status completion_status, feedback_kind text)`
  1. Kalleren er medlem av oppgavens husstand, og oppgaven er ikke arkivert. Ellers `task_not_found` (samme feil for andre husstander, så det ikke lekker om id-en finnes). Oppgaveraden låses med `for update`.
  2. `private.household_has_access(household_id)`, ellers feil `subscription_required`.
  3. `p_member_id` hører til samme husstand. Er kalleren et barn, må `p_member_id` være kallerens eget medlem, oppgaven må være barnets egen eller felles (`assigned_member_id` null), og en jobb må være for alle barna eller for barnet (steg 10a). Ellers `invalid_member`.
  4. `completed_on = (now() at time zone households.timezone)::date`. Klienten sender verken dato eller frist.
  5. Velger en tilbakemeldingstekst (se §4), setter inn raden (`due_on` = oppgavens nåværende `next_due_on`) og setter `tasks.next_due_on = private.compute_next_due(oppgaven, completed_on)`. Alt skjer i én transaksjon.
  6. Steg 9: `reward_nok` = oppgavens beløp hvis den som gjorde oppgaven er et barn, ellers `null`. Er oppgaven en engangsjobb, settes `archived_at = now()`.
  7. Steg 10b: `status` = `pending` hvis det er lønn og kalleren er et barn, ellers `approved`. Returneres også.
  8. **Familieskjerm som kaller:** oppgaven må stå i «I dag», ellers `task_not_due` (skjermen kan vise litt gamle data, og et trykk skal ikke krysse av neste forekomst). Oppgave med ansvarlig bare for den ansvarlige, felles for hvem som helst i husstanden, jobb bare for barn den gjelder. Ellers `invalid_member`.
  9. **Før fristen** (sirkelen i «Kommende»): ingen egen sjekk, avkrysningen virker som ellers. `due_on` er den planlagte datoen, og `completed_on` er i dag. Kalender: `compute_next_due` tar `greatest(next_due_on, completed_on)`, så den planlagte forekomsten hoppes over, og neste frist blir forekomsten etter. Intervall: regnes fra i dag. Angring setter fristen tilbake til den planlagte datoen. Bare den nærmeste forekomsten kan krysses av, fordi en oppgave bare har én åpen forekomst (`next_due_on`). Appen viser sirkel der forekomsten er lik `next_due_on`, men ikke på daglige oppgaver (`canCompleteEarly` i `src/features/tasks/upcoming.ts`). Testes i `supabase/tests/early_completion.test.sql`.
  10. **Feiring for barn** (`*_child_celebration.sql`): `p_last_today` sendes av appen når oppgaven var den siste i barnets «I dag» (barnets enhet: «Mine oppgaver i dag», skjermen: personens kort). Brukes bare når utføreren er barn. `feedback_kind` er tekstgruppen som ble ønsket (se §4), og styrer feiringen i appen (`CelebrationOverlay`).
- `undo_completion(p_completion_id)`: bare den **siste** avkrysningen på en oppgave. Den kan angres av en voksen, eller av den som registrerte den (`recorded_by`, også en familieskjerm), innen 10 minutter. Raden slettes (med beløpet), og `tasks.next_due_on` settes tilbake til `due_on`. En engangsjobb får `archived_at = null` igjen. Feil: `completion_not_found`, `undo_not_allowed`, `undo_expired`. Appen viser «Angre» i 6 sekunder. Steg 10b: en avvist rad kan ikke angres (`undo_not_allowed`), og avviste rader teller ikke som «nyere avkrysning». Et barn kan fortsatt angre sin egen ventende avkrysning.
- `approve_completions(p_completion_ids uuid[]) returns int` (steg 10b): en voksen godkjenner én eller flere («Godkjenn alle»). Bare `pending` endres, så det er trygt å trykke to ganger. Returnerer antall godkjente.
- `reject_completion(p_completion_id)` (steg 10b): «Ikke godkjent». Status blir `rejected`. Er det den siste ikke-avviste avkrysningen på oppgaven, settes `next_due_on` tilbake til `due_on`, og en engangsjobb får `archived_at = null` (som angring). Finnes en nyere, endres bare statusen. Låser oppgaven og leser raden på nytt, så to voksne ikke behandler samme rad samtidig. Feil: `not_pending`.
- `set_completion_status(p_completion_id, p_status)`: endre godkjenning i ettertid fra barnets historikk, godkjent ↔ ikke godkjent. Bare rader med lønn som ikke venter (ventende behandles med de to over). Låser oppgaven, barnets `members`-rad (som `record_payout`) og raden.
  - Til `rejected`: som `reject_completion`. I tillegg avvises det med `reward_already_paid` hvis godkjent − utbetalt − beløpet blir under 0.
  - Til `approved`: beløpet teller igjen. Er det fortsatt den siste ikke-avviste avkrysningen, settes `next_due_on = compute_next_due(oppgaven, completed_on)` (regnet fra dagen den ble gjort), og en engangsjobb som fortsatt er ledig (`archived_at is null`), arkiveres igjen. Er oppgaven gjort på nytt siden (også når en annen har tatt jobben), endres bare statusen.
  - Feil: `status_not_changeable` (venter, uten lønn, samme status eller `p_status = pending`), `reward_already_paid`.
- `remove_completion(p_completion_id)`: «Ikke gjort» for voksne i «I dag», uten tidsgrense. Bare avkrysninger fra i dag (`completed_on = household_today`) som ikke er avvist. Raden slettes. Er det den siste ikke-avviste avkrysningen på oppgaven, settes `next_due_on` tilbake til `due_on`, og en engangsjobb får `archived_at = null`. Ellers slettes bare raden. Et godkjent beløp som allerede er betalt ut (saldo − beløp < 0), gir `reward_already_paid`. Ventende rader kan alltid fjernes.
- `reassign_completion(p_completion_id, p_member_id)`: «Endre hvem som gjorde det», samme krav om i dag og ikke avvist. Frist og arkivering endres ikke. Et barn får beløpet som ble lagret på avkrysningen, eller oppgavens nåværende `reward_nok` hvis avkrysningen ikke hadde beløp (en voksen gjorde den). En voksen får `null`. `status = approved` og `recorded_by = auth.uid()` (en voksen registrerte det, og det forrige barnet kan ikke angre). En jobb kan bare flyttes til et barn jobben gjelder (tom `job_member_ids` = alle barna). Samme sjekk for utbetalt beløp hos personen den flyttes fra. Samme person: ingen endring.
  - Begge låser oppgaven, så de berørte `members`-radene sortert på id, så raden. Feil: `completion_not_found` (borte eller avvist), `not_today`, `reward_already_paid`, `invalid_member` (bare reassign: ikke i husstanden, eller jobben gjelder ikke personen).
- Alle fem krever at kalleren er voksen i husstanden til alle radene og `household_has_access`. Barn, andre husstander og ukjente id-er gir samme feil (`not_adult`), via `private.assert_adult_for_completions`.

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
| requires | jsonb null | betingelser på hjemprofilen. null = ingen. Alle nøkler må stemme. `has_*`: `true`/`false`. `sewage_type`: ikke-tom liste, én må stemme. Eksempel: `{"has_air_heat_pump": true}`, `{"sewage_type": ["septic_tank"]}`. Gyldige nøkler håndheves av `private.template_requires_valid` |
| *gjentakelse* | samme kolonner og check-constraint som `tasks` (også periodekolonnene), unntatt `anchor_on` | årshjulet: `calendar, year, every 1`, `month`, og `month_day` null (månedsoppgave) eller satt (fast dato) |
| source_name | text null | hvem rådet kommer fra, f.eks. «DSB». 1–80 tegn. Vises som «Kilde: DSB» under «Slik gjør du». Kopieres ikke til `tasks`: appen slår opp malen via `template_id`, og viser kilden bare når oppgavens beskrivelse er lik malens |
| source_url | text null | lenke til kilden. Krever `source_name`. Tom til lenkene er sjekket |
| sort_order | smallint not null default 0 | rekkefølge innen måneden |
| is_active | boolean not null default true | maler slettes ikke, de deaktiveres |
| audience | audience not null default `any` | steg 16. `child` = foreslås per barn og tildeles barnet. `any`/`adult` = felles |
| min_age / max_age | smallint null | steg 16, bare barnemaler. Alder = året nå − fødselsår. null = ingen grense. `min_age <= max_age` |
| suggested_by_default | boolean not null default true | steg 16: avhuket fra start i «Forslag til hverdagen» |
| reward_nok | integer null (1–10000) | steg 16, bare barnemaler: forslag til lønn, kopieres når et barn får oppgaven |

Det planlagte `is_annual_wheel` trengs ikke, fordi årshjulet viser maler med `recurrence_unit = 'year'`. Check-constraints: alder og lønn bare når `audience = 'child'` (`task_templates_child_only`), og gyldige aldre (`task_templates_age_valid`).

**Startsett:** 25 maler, 22 i `*_task_templates.sql` og 3 i `*_adjust_task_templates.sql`. Den siste justerer også tre forklaringer, og finner malene på slug. 24 er månedsoppgaver, og røykvarslerne har fast dato 1. desember. Justeringer endrer bare malene. Oppgaver som allerede er aktivert, er kopier og beholder den gamle teksten. Sikkerhetstekstene er generelle og henviser til fagfolk. De må gjennomgås manuelt før lansering, og malene skal utvides til 40–60.

**Hjemprofil** (`*_home_profile_templates.sql`, fra `docs/hjemprofil-oppgaver-UTKAST.md` utkast 2):
- **Betingelser på eksisterende maler:** dekkskift krever bil, `chimney-check` krever peis (i stedet for «hus»), og `garden-mower` krever hage.
- **Erstattet:** `ventilation-filter-spring/autumn` er deaktivert og erstattet av intervallmalen `ventilation-filter`.
- **Nye maler:** 21 årsmaler og 2 intervallmaler (`heat-pump-filter` hver 8. uke, `ventilation-filter` hver 6. måned). Det gir 46 aktive maler.
- **Sesongmaler** (`*_seasonal_tasks.sql`): `lawn-mow` og `weed-beds`. Det gir 48 aktive maler. Se §2 Sesong.
- **Årshjulet** viser maler som passer husstanden, og i tillegg maler husstanden allerede har aktive (`yearWheelTemplates`). En aktiv oppgave forsvinner dermed ikke når et svar endres. En oppgave fra en deaktivert mal vises som egen.

**Aktivering:** RPC `activate_templates(p_household_id, p_template_ids uuid[], p_member_ids uuid[] default null) returns int` **kopierer** malene til nye `tasks`-rader med `template_id` satt og returnerer antall nye oppgaver.
- `p_member_ids` (steg 16) har samme lengde som `p_template_ids` og sier hvem hver oppgave tildeles. null = felles, og uten listen blir alle felles som før. En barnemal må tildeles et barn i husstanden, og andre maler må være felles. Ellers `invalid_assignment` (22023). `reward_nok` kopieres bare når et barn får oppgaven.
- Periodekolonnene kopieres også.
- Maler som allerede er aktive, hoppes over (`on conflict do nothing` på den unike indeksen). Samme RPC brukes for én bryter og for «Velg anbefalte».
- Den kjører som `security invoker`. RLS på `tasks` (voksen og `household_has_access`) og triggeren (`anchor_on` = i dag, `first_due`) gjelder dermed som for andre oppgaver.
- Husstanden kan endre kopien fritt, og senere endringer i malen påvirker ikke eksisterende oppgaver.
- **Intervallmaler** (`recurrence_type = 'interval'`, hjemprofil): første frist er **ett intervall frem**
  (`compute_next_due(oppgaven, i dag)`), ikke i dag. Det settes i INSERT-grenen av `tasks_set_defaults` når
  `template_id` er satt (`*_interval_templates.sql`). Egne intervalloppgaver får fortsatt første frist i dag.
  Endres gjentakelsen senere, starter oppgaven fra i dag, som andre oppgaver. Intervallmaler uten periode vises ikke i
  årshjulet, bare i forslagene fra hjemprofilen. Med periode står de i periodens første måned. Oppgavene havner i Oppgaver.
- **Deaktivering** = arkivere oppgaven (`archived_at`).

Forslag filtreres i TypeScript (`templates/suggest.ts`) på husstandstype, boligtype og hjemprofilen (`requires`, se `templates/requires.ts`), og grupperes i tolv måneder med denne måneden først.

**Rutinemaler (steg 16, `*_routine_template_columns.sql`, `*_routine_templates.sql` og `*_child_routine_templates.sql`):** 28 maler for «Forslag til hverdagen». En rutine er fast kalender hver dag, uke eller måned uten periode (`isRoutineTemplate` i `templates/routines.ts`), så den vises aldri i årshjulet eller i forslagene fra hjemprofilen. Ingen rutiner bruker `requires`, fordi «hverdagen» kommer før hjemprofilen i oppstarten (bil og kjæledyr venter derfor).
- 18 barnemaler (`{family}`), alle med aldersgrense. Det finnes ingen fasit for hva barn i en alder gjør, så alderen **sorterer** forslagene i stedet for å skjule dem: de som passer alderen vises først (noen avhuket, `suggested_by_default`), og resten ligger under «Vis flere forslag», sortert etter alder og aldri avhuket. Et barn uten fødselsår får alle under «Vis flere forslag». Lønn på ekstra innsats, ikke på egne ting som å re opp senga.
- 6 felles maler for alle husstander (3 avhuket) og 4 for par og enslige (ingen avhuket).
- Forslagene regnes ut i `templates/routines.ts`: felles maler på mal-id, barnemaler per barn på mal + barn. Det som er aktivt, vises dempet nederst som «Lagt til» og kan ikke velges.

### `feedback_messages`
| Kolonne | Type | Merknad |
|---------|------|---------|
| id | uuid pk | |
| tone | text not null | `fact` / `humor` (ikke `both`, det er et filter) |
| text | text not null | «Visste du at …» / «Hvor mange hybelkaniner fant du?» |
| audience | audience not null | |
| template_id | uuid null → task_templates | mest spesifikk. **Ikke laget ennå**, kommer med tekster per mal i steg 12 |
| category | text null | nest mest spesifikk. Er begge null, er teksten generell |
| is_active | boolean not null default true | |
| kind | text not null default `regular` | `regular` / `day_done` (barnets siste oppgave for dagen) / `young` (barn 5 år eller yngre) |

**Utvalg** skjer på serveren, i `complete_task`, som returnerer teksten (endret i steg 5 fra et utvalg på klienten):
1. Ønsket gruppe (`kind`): voksne får alltid `regular`. For barn går `day_done` (når `p_last_today`) foran `young` (år i dag minus `birth_year` ≤ 5), ellers `regular`. Bare tekster i ønsket gruppe eller `regular` tas med, og ønsket gruppe sorteres først. Finnes ingen aktiv tekst i gruppen, brukes en `regular`-tekst.
2. Filtrer på husstandens tone (`both` = begge) og målgruppen til den som gjorde oppgaven (`any` eller rollen). Tonen gjelder bare `regular`. `day_done` og `young` vises i alle toner (de er lagret med `tone = 'humor'`).
3. Bare tekster for oppgavens kategori eller generelle tekster.
4. Sorter: ikke den siste teksten i samme gruppe som personen fikk (så samme tekst aldri kommer to ganger på rad), deretter ikke blant de 20 sist viste i husstanden først, deretter kategori foran generell, deretter tilfeldig. Er alle vist nylig, gjentas en tekst.
5. `feedback_message_id` lagres på avkrysningen.

Tekstene for feiringen (vanlige for barn, `day_done` og `young`) ligger i `*_child_celebration.sql`.

Startsettet (33 tekster) ligger i migrasjonen `*_task_completions.sql` og er justert i `*_adjust_feedback_messages.sql` (36 aktive, 5 deaktivert). Tekster deaktiveres med `is_active = false` i stedet for å slettes, så tidligere avkrysninger beholder koblingen. Det flyttes til `supabase/seed/feedback.sql` og utvides til 80–100 i steg 12.

---

## 5. Row Level Security

### Hjelpefunksjoner (schema `private`, ikke eksponert i API-et)
Alle er `language sql stable security definer set search_path = ''`. Da unngås rekursjon, fordi policyer på `members` ellers ville lest `members` på nytt.

```sql
private.my_household_ids()        returns setof uuid  -- household_id for auth.uid()
private.is_adult(hid uuid)        returns boolean     -- auth.uid() er voksen i hid
private.my_member_id(hid uuid)    returns uuid
private.household_has_access(hid) returns boolean     -- prøvetid eller aktivt abonnement (foreløpig bare prøvetid; abonnement i steg 18)
```

Policyer bruker `household_id in (select private.my_household_ids())`. Innpakningen i `select` gjør at funksjonen evalueres én gang per spørring, ikke én gang per rad.

Merk: Anonyme brukere (barneenheter og familieskjermer) har også rollen `authenticated`. Det er trygt, fordi hver policy krever medlemskap via `auth_user_id`. Familieskjermen er ikke medlem, og `private.my_display_household()` brukes bare av funksjonene som er laget for den.

### Policyer per tabell

| Tabell | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| households | medlem | – (RPC `create_household`) | voksen; kolonner: `name`, `type`, `housing_type`, `feedback_tone` og hjemprofilen (`has_*`, `sewage_type`) | – (Edge `delete-account`) |
| members | medlem i samme husstand | voksen, bare `role = 'child'` og `auth_user_id is null` | voksen; kolonner: `display_name`, `avatar`, `birth_year`, `photo_path`, `avatar_mode`. På en annen voksen stopper triggeren `members_guard_other_adult_profile` endring av navn (`not_own_name`) og figur, visning og bilde (`not_own_profile`); barna kan alle voksne endre. Barn: bare egen avatar via RPC `set_my_avatar` og figur/bilde via `set_my_avatar_mode` | voksen, bare `role = 'child'` (appen sletter bildemappen først, se §6) |
| tasks | medlem | voksen **og** `household_has_access` | voksen (inkl. arkivering via `archived_at`) | – (arkiver i stedet) |
| today_tasks (view) | medlem (via RLS på tasks) | – | – | – |
| today_completions (view) | som task_completions: voksen alt, barn bare egne | – | – | – |
| recent_completions (view) | som task_completions: voksen alt, barn bare egne | – | – | – |
| task_completions | voksen i husstanden, eller barnet som gjorde den (steg 10a) | – (RPC `complete_task`) | – | – (RPC `undo_completion`) |
| payouts | voksen i husstanden, eller barnet som fikk den (steg 10a) | – (RPC `record_payout`) | – | – |
| member_balances (view) | voksen: alle barna; barn: bare seg selv (filter i viewet + RLS på tabellene under) | – | – | – |
| invites | voksen i husstanden; alle kolonner unntatt `code_hash` | – (RPC `create_invite`) | – (RPC `accept_invite`) | voksen, bare `used_at is null` (= trekke tilbake) |
| invite_attempts | – | – (RPC) | – | – |
| link_tokens | – | – (RPC `create_link_token`, `create_display_link_token`) | – (RPC `redeem_link_token`) | – |
| household_displays | voksen i husstanden; ikke `auth_user_id` | – (RPC `redeem_link_token`) | – | – (RPC `unlink_display`) |
| link_attempts | – | – (RPC) | – | – |
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
-- Profilbilder (*_member_photos.sql):
grant update (photo_path, avatar_mode) on public.members to authenticated;

revoke update on public.households from authenticated;
grant update (name, type, housing_type, feedback_tone) on public.households to authenticated;
-- Hjemprofil (egen migrasjon, *_home_profile.sql):
grant update (has_garden, has_car, has_cabin, has_air_heat_pump, has_fireplace,
              has_balanced_ventilation, has_hydronic_heating, has_private_well, sewage_type)
  on public.households to authenticated;
```

### RPC-oversikt
Alle RPC-er er `security definer` og `set search_path = ''`, unntatt `get_upcoming_occurrences` og `activate_templates`, som kjører som `security invoker` (RLS gjelder). `execute` er revoked fra `anon` og `public` og granted til `authenticated`. Hjelpefunksjoner i `private` som bare kalles fra slike RPC-er (`delete_anonymous_users`, `assert_adult_for_completions`, `member_balance`, `lock_today_completion`, `assert_reward_not_paid`, `lock_task_for_adult`, `board_template`) og systemjobbene (`roll_over_seasons`, `delete_stale_anonymous_users`) har ikke `execute` for `authenticated`. Gi og ta rettigheter per funksjon, ikke med `on all functions in schema private`: det åpner igjen det som er stengt.

| Funksjon | Hvem | Gjør |
|----------|------|------|
| `create_household(p_name, p_type, p_housing_type, p_display_name, p_avatar) returns uuid` | innlogget, ikke-anonym, uten husstand | household + voksen-member i én transaksjon, `trial_ends_at = now() + 14 d`. Feil (errcode `P0001`, nøkkel som melding): `not_authenticated`, `anonymous_not_allowed`, `already_in_household` |
| `create_invite(p_household_id) returns table (code, expires_at)` | voksen, `household_has_access` | lager kode (8 tegn, 48 t, engangs), lagrer hash, returnerer klartekst bare her. Feil: `not_authenticated`, `not_adult` (barn, anonym, annen husstand), `subscription_required` |
| `accept_invite(p_code, p_display_name, p_avatar) returns uuid` | innlogget, ikke-anonym, uten husstand | normaliserer koden, legger til voksen-member og markerer invitasjonen brukt i én transaksjon. Returnerer husstandens id. Feil: `not_authenticated`, `anonymous_not_allowed`, `already_in_household`, `too_many_attempts`. **Feil, utløpt, brukt eller tilbaketrukket kode gir `null`**, som appen gjør om til `invite_invalid`. Grunnen: en kastet feil ruller tilbake hele transaksjonen, også raden i `invite_attempts`, og da ville sperren aldri slått inn. `pg_advisory_xact_lock` per bruker hindrer at parallelle kall sniker seg forbi sperren |
| `create_link_token(p_member_id) returns table (code, expires_at)` | voksen i barnets husstand | lager kode (8 tegn, 10 min, engangs), sletter barnets ubrukte koder, returnerer klartekst bare her. Krever ikke abonnement. Feil: `not_adult` (barn, annen husstand, ukjent id), `invalid_member` (ikke et barn), `already_linked` (barnet har enhet, koble fra først) |
| `create_display_link_token(p_household_id) returns table (code, expires_at)` | voksen i husstanden | som `create_link_token`, men for en familieskjerm (`member_id` null). Sletter husstandens ubrukte skjermkoder. Feil: `not_adult` |
| `unlink_display(p_display_id)` | voksen i husstanden | sletter skjermraden og den anonyme brukeren. Feil: `not_adult` (også ukjent id og annen husstand) |
| `unlink_this_display()` | familieskjerm | skjermen kobler fra seg selv: sletter sin egen rad i `household_displays` og sin anonyme bruker. Ingen parameter, så den kan ikke koble fra andre skjermer. Feil: `not_display` (voksen, barn eller ukoblet enhet) |
| `get_family_board() returns jsonb` | familieskjerm | alt skjermen får lese: husstandsnavn, `today`, medlemmer, dagens oppgaver og avkrysninger. Til personvisningen også `upcoming_tasks` (aktive oppgaver med ansvarlig, ikke jobber eller felles, bare visningsfeltene), `occurrences` (fra i morgen og 14 dager fram) og `recent` (i går og tre dager bakover, uten avviste, uten `recorded_by`). Oppgavene i `tasks` og `upcoming_tasks` har `description` og `template` (malens beskrivelse, kilde og gjentakelse, `null` uten mal) til «Slik gjør du». Ikke fødselsår, `auth_user_id` eller saldo. `recorded_by` bare når skjermen selv registrerte. `null` for alle andre. Er `security definer`, så RLS gjelder ikke: spørringene filtrerer selv på husstanden |
| `redeem_link_token(p_code) returns uuid` | anonym innlogget uten husstand (barnets enhet eller familieskjerm) | normaliserer koden, setter `members.auth_user_id = auth.uid()` (eller lager raden i `household_displays` når koden ikke har `member_id`) og `used_at`. Returnerer husstandens id. Feil: `not_authenticated`, `anonymous_required` (e-postbruker), `already_in_household`, `too_many_attempts`. **Feil, utløpt eller brukt kode, eller et barn som ble koblet i mellomtiden, gir `null`** (appen: `link_invalid`), av samme grunn som `accept_invite`. Advisory lock per bruker |
| `unlink_member_device(p_member_id)` | voksen | `auth_user_id = null` på barnet, og sletter den anonyme brukeren i `auth.users` (med sesjoner og refresh-token, så barnet logges ut). Trygt å kalle igjen. Feil: `not_adult`, `invalid_member` |
| `unlink_my_device()` | barn på egen (anonym) enhet | barnet kobler fra seg selv («Logg ut av denne enheten»): egen `auth_user_id = null`, og egen anonym bruker slettes. En vanlig utlogging ville latt profilen stå koblet til en bruker ingen kan logge inn som. Feil: `invalid_member` (voksen, eller ikke koblet) |
| `set_my_avatar(p_avatar)` | medlem (brukes av barn) | ny avatar på egen `members`-rad, ingenting annet. RPC i stedet for policy, fordi kolonnerettigheter gjelder hele rollen `authenticated`: en update-policy for barn ville også gitt dem navn og fødselsår. Sjekker formen (`^[a-z_]{1,30}$`), ikke listen, så nyere appversjoner kan legge til avatarer. Feil: `not_authenticated`, `invalid_avatar`, `member_not_found` |
| `set_my_avatar_mode(p_mode)` | medlem (brukes av barn) | figur eller bilde på egen `members`-rad. Bildet legges inn og fjernes bare av voksne. Feil: `not_authenticated`, `member_not_found`, `no_photo` (`photo` uten bilde) |
| `my_photo_folders_to_delete() returns text[]` | innlogget (kalles av Edge `delete-account`) | bildemappene som forsvinner med kontoen, etter samme regler som `delete_my_account_data`: siste voksne gir alle mapper i husstanden, ellers egen mappe. Barn/uten medlemskap: ingen. Se §6 |
| `complete_task(task_id, member_id, last_today)` / `undo_completion(completion_id)` | medlem (se §3) | avkrysning med neste frist og tilbakemelding / angring |
| `activate_templates(p_household_id, p_template_ids, p_member_ids default null) returns int` | voksen, `household_has_access` (via RLS på `tasks`) | kopierer maler til oppgaver, med valgfri ansvarlig per mal (barnemaler til et barn, ellers felles), hopper over aktive og inaktive maler, returnerer antall nye. Feil: `42501` (barn, annen husstand, utløpt prøvetid), `invalid_assignment` (feil eller manglende barn, ulik lengde) |
| `get_upcoming_occurrences(household_id, from, to)` | medlem (via RLS) | fremtidige forekomster til årshjulet (se §2) |
| `approve_completions(p_completion_ids)` / `reject_completion(p_completion_id)` | voksen, `household_has_access` | godkjenning av lønn (se §3). Feil: `not_adult` (barn, annen husstand, ukjent id), `subscription_required`, `not_pending` (bare avvisning) |
| `set_completion_status(p_completion_id, p_status)` | voksen, `household_has_access` | endre godkjenning i ettertid, godkjent ↔ ikke godkjent (se §3). Feil: `not_adult`, `subscription_required`, `status_not_changeable`, `reward_already_paid` |
| `remove_completion(p_completion_id)` / `reassign_completion(p_completion_id, p_member_id)` | voksen, `household_has_access` | rette dagens avkrysninger i «I dag» hele dagen: «Ikke gjort» og «Endre hvem som gjorde det» (se §3). Feil: `not_adult`, `subscription_required`, `completion_not_found`, `not_today`, `reward_already_paid`, `invalid_member` |
| `postpone_task(p_task_id, p_to) returns date` | voksen, `household_has_access` | «Utsett til» (se §2 Utsettelse). Låser oppgaven. Returnerer fristen før. Alle oppgaver med åpen frist, også kommende og allerede utsatte, men ikke jobber eller utførte engangsoppgaver. `p_to` må være etter både i dag og fristen, og høyst 366 dager fram. Feil: `not_adult` (barn, annen husstand, ukjent eller arkivert), `subscription_required`, `not_postponable`, `invalid_date` |
| `undo_postpone(p_task_id)` | voksen, `household_has_access` | «Angre»: fristen før kommer tilbake, også forfalt. For engangsoppgaver settes `once_on` først og fristen i en egen spørring, ellers ville triggeren flyttet en passert dato til i dag. Bare mens oppgaven fortsatt er utsatt. Feil: `not_adult`, `subscription_required`, `undo_postpone_expired` (krysset av eller redigert siden) |
| `record_payout(p_member_id, p_amount_nok) returns uuid` | voksen, `household_has_access` | registrerer en utbetaling til et barn. Fra steg 10b er grensen godkjent saldo (ventende og avviste teller ikke). Låser barnets `members`-rad, så to samtidige utbetalinger ikke begge går gjennom. Feil: `not_adult` (barn, annen husstand), `invalid_member` (ikke et barn), `subscription_required`, `amount_exceeds_balance` (under 1 eller over saldoen) |
| `get_access(household_id)` | medlem | `{ trial_ends_at, is_active }` |
| `delete_my_account_data()` | innlogget (kalles av Edge `delete-account`) | ingen parametere, bruker `auth.uid()`. Siste voksne: sletter husstanden (cascade) og de anonyme brukerne til barna og familieskjermene. Andre voksne finnes: sletter bare egen `members`-rad. Barn/uten medlemskap: ingenting. Låser husstandsraden (`for update`) før voksne telles |

### Opprydding av anonyme brukere (misbruksvern)
Barnets enhet og familieskjermen logger inn anonymt før koden løses inn, så hvem som helst kan lage anonyme brukere. Supabase Auth begrenser antallet per IP. I tillegg sletter `private.delete_stale_anonymous_users(p_now default now()) returns integer` brukere som:
- har `is_anonymous` og ingen e-post,
- er opprettet for mer enn 24 timer siden,
- ikke er koblet: ikke barn i `members` og ikke skjerm i `household_displays`.

E-postbrukere og koblede anonyme brukere røres aldri. Voksne kan ikke være anonyme. Selve slettingen går via `private.delete_anonymous_users`. `for update skip locked` gjør at en bruker som kobles akkurat mens jobben kjører, hoppes over i stedet for å slettes. Den kjøres hver time av pg_cron (`cron.job` `delete-stale-anonymous-users`, minutt 35). Innloggede kan ikke kjøre funksjonen. En enhet som venter mer enn 24 timer før den løser inn koden, må starte på nytt.

Dette er et midlertidig vern. **CAPTCHA (`[auth.captcha]`, hCaptcha eller Turnstile) skal på før offentlig lansering.**

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

11. Lønn og jobber (`rewards.test.sql`):
    - Beløpet lagres ved avkrysning, endret pris endrer ikke tidligere beløp, angring fjerner beløpet, og voksne får ikke lønn.
    - Bare voksne kan sette beløp og registrere utbetaling. Ingen kan skrive direkte i `payouts`.
    - Saldoen regnes riktig. Utbetaling over saldoen, på 0 kr og til en voksen avvises.
    - En engangsjobb arkiveres etter utføring (og kan ikke gjøres igjen), og angring henter den tilbake. En gjentakende jobb kan gjøres flere ganger.
    - Jobber har aldri frist, er ikke forfalt i `today_tasks` og er ikke med i `get_upcoming_occurrences`.
    - Ingen ser saldo, utbetalinger eller jobber i en annen husstand. Check-constraints for `job` og `job_repeats`.

12. Jobber for utvalgte barn (`job_members.test.sql`):
    - En jobb kan være for to av tre barn, og listen følger med i `today_tasks`. Tom liste er standard.
    - Et barn fra en annen husstand, en voksen og samme barn to ganger avvises, også ved endring.
    - Listen er bare lov for jobber, og jobber kan ikke ha `assigned_member_id`.
    - Slettes et barn, fjernes det fra listen. En annen husstand ser ikke jobben.

13. Barnas enhet (`child_devices.test.sql`, steg 10a):
    - Koden har 8 tegn, utløper etter 10 minutter, og klarteksten lagres ikke. `link_tokens` kan ikke leses.
    - Barn, en annen husstand, en voksen som mål og et barn som allerede er koblet, avvises.
    - Koden virker én gang (også med små bokstaver og bindestrek). Utløpt og feil kode gir null. Feil lagres som forsøk, sperre etter 5 (også for riktig kode), som slipper etter 15 minutter. E-postbruker og bruker med husstand avvises.
    - Et barn kan krysse av egen og felles oppgave, jobb for alle og jobb for seg selv, men ikke søskens oppgave, jobb for et annet barn, eller for søsken.
    - Et barn ser bare egen saldo, egne avkrysninger og egne utbetalinger. Voksne ser alt.
    - Frakobling: barn og annen husstand avvises. Koblingen fjernes, den anonyme brukeren slettes, historikken består, og den gamle sesjonen ser ingenting. Barnet kan kobles til igjen.
    - `delete_account.test.sql`: siste voksne sletter også barnas anonyme brukere. Er det en voksen igjen, beholdes de.
    - `child_settings.test.sql`: barnet kan endre egen avatar via `set_my_avatar` (ugyldig nøkkel avvises), men ikke eget navn, fødselsår, rolle eller kobling, og ikke andres avatar. `unlink_my_device` kobler fra bare barnet selv og sletter bare dets anonyme bruker. Voksne og anon avvises.

14. Godkjenning av lønn (`reward_approval.test.sql`, steg 10b):
    - Barn med lønn på egen enhet gir `pending`. Uten lønn, og alt en voksen registrerer (også for barnet), gir `approved`.
    - Saldoen viser ventende med én gang, men utbetaling over godkjent saldo avvises, selv om noe venter.
    - Barn, en annen husstand, ukjente id-er og anon kan ikke godkjenne eller avvise. Status kan ikke endres direkte.
    - Godkjenning endrer bare ventende rader og er trygg å gjenta. «Godkjenn alle» godkjenner flere.
    - Avvisning trekker beløpet. Siste avkrysning på en gjentakende oppgave gir fristen tilbake, og oppgaven er i «I dag» igjen. En engangsjobb blir ledig igjen. Finnes en nyere avkrysning, står fristen.
    - Avvist kan ikke avvises, godkjennes eller angres. Barnet ser at raden er avvist, kan angre egen ventende, og kan gjøre en avvist oppgave på nytt.

15. Utsettelse (`postpone_task.test.sql`):
    - Voksen utsetter: ny frist, `postponed_*` satt, borte fra `today_tasks`. Gjentakelsen er uendret, og kommende forekomster er utsatt dato og så vanlig mønster (kalender og intervall).
    - Utsatt til en dag i mønsteret gir én forekomst den dagen. Daglig oppgave: dagene imellom hoppes over.
    - Forfalt oppgave kan utsettes. Angre gir forfalt frist tilbake, også for engangsoppgaver, og kan ikke gjøres to ganger.
    - Krysset av etter utsettelse: kan ikke angres. Angres avkrysningen, er den utsatt igjen.
    - Engangs: `once_on` flyttes. Månedsoppgave: `due_by` = ny dato.
    - Kommende forekomst kan utsettes og angres, men ikke til fristen eller før. Utsatt oppgave kan utsettes igjen, og angre går ett steg tilbake.
    - Endret gjentakelse nullstiller. Klienten kan ikke skrive `postponed_*`.
    - Jobb, oppgave fram i tid, i dag, over ett år, barn, annen husstand og utløpt prøvetid avvises.

17. Familieskjerm (`family_display.test.sql`):
    - Kobling: kode på 8 tegn, 10 minutter, én gang, bare den nyeste gjelder, og sperren mot gjetting. Barn, annen husstand, e-postbruker og enhet som allerede er koblet, avvises.
    - Tavla har bare egen husstand, og ikke fødselsår, `auth_user_id` eller andres `recorded_by`. Beskrivelsen og malen (med kilde) er med, til «Slik gjør du».
    - Skjermen ser ingen rader direkte i husstand, medlemmer, oppgaver, avkrysninger, utbetalinger, saldo eller views.
    - Avkrysning etter reglene, lønn gir `pending`, `task_not_due`, utløpt prøvetid, og angring bare av egne innen 10 minutter.
    - Skjermen kan ikke godkjenne, avvise, endre, fjerne, flytte, utsette, betale ut, koble enheter, invitere, eller skrive direkte i tabellene.
    - Bilder: bare de som vises i egen husstand, ingen opplasting eller sletting.
    - Frakobling og sletting: anonym bruker fjernes, skjermen består når en av flere voksne sletter seg, og alt forsvinner med husstanden.
    - Personvisning og «Koble fra denne skjermen» (`family_display_person.test.sql`): `upcoming_tasks`, `occurrences` og `recent` bare fra egen husstand, uten jobber, felles, arkiverte, avviste og sensitive felt. `unlink_this_display` kobler bare fra den som kaller. Voksen, barn og ukoblet enhet får `not_display`.

Tester for `compute_next_due` og månedsoppgaver med faste datoer: se §2.

16. Profilbilder (`member_photos.test.sql`):
    - Bøtta er privat. Voksne kan laste opp for seg selv og barna i egen husstand, ikke for en annen voksen.
    - Barn kan ikke laste opp eller slette, heller ikke bilde av seg selv. En annen husstand kan ikke lese, laste opp eller slette. Anon ser ingenting.
    - Stier til et medlem som ikke finnes, et medlem i en annen husstand, filer rett i husstandsmappen og filnavn som ikke er `{uuid}.jpg` avvises.
    - `photo_path` kan ikke peke på en annen persons mappe, og bilde-modus krever bilde. Barn kan ikke endre `photo_path`. `set_my_avatar_mode` endrer bare egen rad og avviser `photo` uten bilde.
    - `my_photo_folders_to_delete` gir riktige mapper for siste voksne, voksen med andre voksne og barn. Bildet av et slettet medlem kan ikke leses.

16b. Eget navn, egen figur og eget bilde for voksne (`own_adult_name.test.sql`, `own_adult_profile.test.sql`):
    - En voksen kan endre eget navn, figur, `avatar_mode` og `photo_path`, og barnas. På en annen voksen gir navn `not_own_name` og figur/visning/bilde `not_own_profile`. Uendrede verdier stoppes ikke, og uten innlogget bruker gjelder ikke regelen.
    - Barnet velger fortsatt figur (`set_my_avatar`) og figur/bilde (`set_my_avatar_mode`) selv.
    - Storage: opplasting og sletting i egen mappe og barnas mapper, ikke i en annen voksens mappe (heller ikke erstatte). Lesing som før.
    - Service-rollen (Edge `delete-account`) kan fortsatt slette alle bilder i husstanden.

18. Opprydding av anonyme brukere (`anonymous_cleanup.test.sql`):
    - Ukoblet og eldre enn 24 timer slettes. Ukoblet og ny beholdes, til den passerer 24 timer.
    - Koblet barn (koblingen består), koblet skjerm (raden består), e-postbruker uten kobling og voksen beholdes.
    - Timesjobben finnes. Innloggede kan ikke kjøre funksjonen.

19. Rettigheter i `private` (`private_function_privileges.test.sql`):
    - `authenticated`, `anon` og `public` har ikke `execute` på hjelpefunksjonene som bare kalles fra `security definer`-RPC-er eller systemjobber.
    - Alle funksjoner i `public` som kaller dem, er `security definer` og eies av `postgres`.

---

## 6. Storage: profilbilder

Bøtta `member-photos` er **privat** (`public = false`), tar bare `image/jpeg` og maks 1 MB. Appen laster opp 512×512 JPEG (kvalitet 0,8), krympet og beskåret på enheten. Den nye kodingen tar ikke med EXIF, så posisjon og kamerainfo blir ikke lastet opp.

**Sti:** `{household_id}/{member_id}/{uuid}.jpg`. Hver opplasting får et nytt filnavn, så cachen i appen aldri viser et gammelt bilde. `members.photo_path` peker på filen som er i bruk. Når et nytt bilde lastes opp, slettes det gamle.

**Visning:** signerte URL-er (`createSignedUrls`, 1 time). Appen henter nye etter 50 minutter. `expo-image` cacher bildet på disk med stien som nøkkel, så en ny URL laster ikke ned bildet på nytt. Bildet vises bare når `avatar_mode = 'photo'`, og hvis det ikke lastes, vises figuren (`src/features/household/photo.ts`).

**Policyer på `storage.objects`** (alle med `bucket_id = 'member-photos'`):

| Operasjon | Hvem |
|-----------|------|
| SELECT (lese, liste, signere URL) | medlem i husstanden (også barn med enhet). Familieskjerm: bare bilder som vises (`photo_path` og `avatar_mode = 'photo'`) i egen husstand |
| INSERT (laste opp) | voksen i husstanden, i egen mappe eller et barns mappe, filnavn `{uuid}.jpg` |
| DELETE | voksen i husstanden, i egen mappe eller et barns mappe |
| UPDATE | ingen (appen laster aldri opp over en fil) |

INSERT og DELETE bruker i tillegg `private.photo_member_writable(name)`: medlemmet i stien er et barn eller den innloggede selv (`*_own_adult_profile.sql`). Edge `delete-account` sletter med service-rollen og går forbi RLS, så sletting av konto og husstand fjerner fortsatt alle bilder.

Alle bruker `private.photo_household(name)`. Den gir husstanden bare når stien har formen `{household_id}/{member_id}/fil` **og** medlemmet finnes i den husstanden. Når medlemmet er slettet, kan ingen lese en fil som eventuelt er blitt liggende igjen.

**Sletting.** Supabase stopper `DELETE` på `storage.objects` med SQL (triggeren `storage.protect_delete`), så cascade i databasen kan ikke rydde filene. Filene slettes derfor med Storage-API-et, **før** radene, slik at en feil stopper slettingen og kan prøves igjen. Alle stedene et medlem kan forsvinne:

| Hendelse | Hvor | Hva slettes |
|----------|------|-------------|
| Voksen sletter et barn | appen, `deleteChild` (`src/features/household/api.ts`) | barnets mappe, deretter raden |
| Voksen sletter kontoen, andre voksne finnes | Edge `delete-account` | egen mappe (`my_photo_folders_to_delete`), deretter `delete_my_account_data` |
| Siste voksne sletter kontoen (husstanden slettes) | Edge `delete-account` | alle mapper i husstanden, deretter `delete_my_account_data` |
| Voksen fjerner bildet | appen, `removeMemberPhoto` | medlemmets mappe, `photo_path = null`, `avatar_mode = 'figure'` |

Barnets enhet kobles fra (`unlink_*`): profilen består, og bildet blir værende. Det finnes ingen flyt der en voksen forlater husstanden uten å slette kontoen, eller der en voksen fjerner en annen voksen (`members_delete` tillater bare barn). Kommer slike flyter, må de også slette mappen.
