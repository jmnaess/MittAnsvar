# MittAnsvar – arkitektur og analyse

Status: forslag før koding. Datamodell og RLS i detalj: se [DATABASE.md](DATABASE.md).

---

## 1. Produktanalyse: uklarheter og mulige problemer

**Hull i det som er beskrevet**

| # | Tema | Problem | Forslag |
|---|------|---------|---------|
| 1 | Påminnelser | Appen skal hjelpe folk å *huske*, men varsler er ikke nevnt. Uten varsler må brukeren selv åpne appen. | Lokale varsler (planlagt på enheten) i MVP. Push fra server senere. NB: fjern-push virker ikke i Expo Go på Android. |
| 2 | Boligtype | Årshjulet avhenger mer av *bolig* enn av husstandstype. Takrenner og drenering er irrelevant i leilighet. | Spør om boligtype ved oppstart: leilighet, rekkehus, enebolig. |
| 3 | Hvem gjør hva | Er en oppgave knyttet til én person, flere, «hvem som helst», eller går den på rundgang? | MVP: én ansvarlig **eller** «hvem som helst». Rundgang kommer senere. |
| 4 | Fast kalender, glemt gang | Hvis «hver søndag» ikke blir gjort: hoper den seg opp, eller hopper den til neste søndag? | Én forfalt forekomst vises til den er utført. Etterpå hopper neste frist til første dato etter i dag. Ingen opphopning. |
| 5 | Barn i to hjem | Delt omsorg er vanlig. Barnet kan høre til to husstander. | MVP: én bruker = én husstand. Hver husstand lager sin egen barneprofil. Modellen tåler flere husstander senere. |
| 6 | Prøvetid | Skal de 14 dagene være i appen (uten kort) eller i butikken (Apple/Google-tilbud, krever kort)? | Prøvetid i appen, uten kort. Det er enklere og gir færre som faller fra. Se §4. |
| 7 | Når abonnementet utløper | Blir data slettet, låst eller skrivebeskyttet? | Skrivebeskyttet: alt kan leses, men ingen kan krysse av. Ingen data slettes. |
| 8 | Roller blant voksne | Er alle voksne like, eller finnes en «eier»? Hva skjer ved samlivsbrudd? | Alle voksne er like i MVP. Husstanden slettes når siste voksne forlater den. |
| 9 | Hva barn kan gjøre | Kan barn se andres oppgaver? Krysse av for andre? Lage oppgaver? | Barn ser hele husstandens liste, men kan bare krysse av for seg selv. De kan ikke redigere. |
| 10 | Tilbakemeldingstekster | De må passe både for barn og voksne, og det trengs mange nok til at de ikke gjentas. Det er skrivearbeid. | Tekstene får målgruppe (barn/voksen/alle). Start med 100–150 tekster. Fakta om sikkerhet (røykvarsler, el) må kvalitetssikres. |
| 11 | Innhold i årshjulet | Råd om el, brann og fukt kan gi ansvar hvis de er feil. | Korte, generelle tekster med henvisning til en fagperson. Lenk til offentlige kilder, f.eks. DSB. |
| 12 | Butikkregler | Apple krever sletting av konto i appen. De krever også «Logg inn med Apple» hvis Google-innlogging tilbys. | MVP: e-post med engangskode. Sletting i appen fra dag én. |
| 13 | Butikkavgift | 39 kr gir omtrent 33 kr etter Apple/Googles andel (15 % for små utviklere). | Meld deg på Small Business Program hos Apple og tilsvarende hos Google. |

**Tekniske risikoer**
- **Expo Go-begrensning.** RevenueCat (ekte kjøp) og fjern-push krever en *development build* med EAS, ikke Expo Go. Derfor kommer betaling sent i rekkefølgen. Alt annet kan testes i Expo Go.
- **Magic link.** Innlogging via e-postlenke er knotete med dyplenker i Expo Go. Bruk heller en 6-sifret engangskode (OTP) på e-post.
- **Tidssoner.** Frister lagres som `date` i husstandens tidssone (`Europe/Oslo`), ikke som tidspunkt. Da slipper vi feil rundt midnatt og sommertid.

---

## 2. MVP-arkitektur

```
 Mobil (Expo / React Native)                 Supabase (EU)
 ┌──────────────────────────────┐            ┌──────────────────────────────┐
 │ expo-router (skjermer)       │  anon key  │ Auth (e-post-OTP, anonym)    │
 │ TanStack Query (servertilst.)│ ─────────► │ Postgres + RLS               │
 │ supabase-js                  │   + JWT    │ RPC-funksjoner (SQL)         │
 │ expo-secure-store (sesjon)   │            │ Edge Functions (få):         │
 │ expo-camera (QR)             │            │  - revenuecat-webhook        │
 │ expo-notifications (lokale)  │            │  - delete-account            │
 │ react-native-purchases (sen.)│            └──────────────▲───────────────┘
 └──────────────────────────────┘                           │ webhook
                                                  RevenueCat ┘
```

**Prinsipper**
- **Klienten snakker direkte med databasen, og RLS er sikkerheten.** Anon-nøkkelen er offentlig. Alt som ikke er beskyttet av RLS, er åpent.
- **Operasjoner som endrer flere tabeller, går gjennom én RPC-funksjon** (`create_household`, `complete_task`, `redeem_link_token`). Da blir de atomiske, og reglene ligger på ett sted.
- **Edge Functions bare når vi trenger hemmeligheter eller admin-rettigheter:** RevenueCat-webhook og sletting av brukere i `auth.users`.
- **Ingen global state-manager.** TanStack Query holder serverdata. Lokal UI-tilstand holdes med `useState`.
- **Gjentakelseslogikken er en ren TypeScript-funksjon med enhetstester** (`computeNextDue`). Den er lett å teste og lett for AI å endre trygt.
- **Supabase CLI med migrasjoner i git.** Ingen endringer via Dashboard. Typer genereres med `supabase gen types`.

**Mappestruktur**

```
app/                          # expo-router: kun skjermer, tynne
  _layout.tsx
  (auth)/sign-in.tsx
  (onboarding)/household.tsx      # type, bolig, navn
  (onboarding)/members.tsx        # legg til barn
  (onboarding)/suggestions.tsx    # velg foreslåtte oppgaver
  (app)/(tabs)/index.tsx          # «I dag»
  (app)/(tabs)/year.tsx           # Årshjul
  (app)/(tabs)/household.tsx      # medlemmer, koble enhet
  (app)/(tabs)/settings.tsx
  (app)/task/[id].tsx
  (app)/task/new.tsx
  kiosk/index.tsx                 # felles husstandsvisning
  link-device.tsx                 # barnets enhet: skann QR
  paywall.tsx
src/
  lib/            supabase.ts, queryClient.ts, dates.ts
  features/
    auth/         api.ts, hooks.ts
    household/    api.ts, hooks.ts, components/
    tasks/        api.ts, hooks.ts, recurrence.ts, recurrence.test.ts, components/
    completions/  api.ts, hooks.ts
    templates/    api.ts, suggest.ts, suggest.test.ts
    feedback/     pickFeedback.ts, components/FeedbackToast.tsx
    kiosk/        pin.ts, components/
    devices/      api.ts (QR-token)
    subscription/ revenuecat.ts, useAccess.ts
    notifications/ schedule.ts
  components/     generiske UI-komponenter (Button, Avatar, Screen …)
  types/database.ts               # generert, ikke rediger
supabase/
  migrations/                     # SQL, én fil per endring
  functions/revenuecat-webhook/
  functions/delete-account/
  seed/templates.sql, seed/feedback.sql
  tests/rls.test.sql              # pgTAP: RLS-tester
docs/
```

Hver `feature` eier sine egne API-kall og hooks. Skjermene i `app/` setter bare sammen komponenter.

---

## 3. Barneprofiler, QR-kobling og felles visning

### Barneprofil
- En rad i `members` med `role = 'child'`, `display_name`, `avatar` (nøkkel til en innebygd illustrasjon, aldri et bilde) og `birth_year`.
- **Ingen e-post og ingen konto.** `auth_user_id` er `null` til en enhet blir koblet til.
- Det er bare voksne i husstanden som kan opprette, endre og slette barneprofiler.

### Barn med egen enhet (QR)
1. **Voksen:** trykker «Koble til enhet» på barnets profil. Appen kaller `create_link_token(member_id)`.
   - Serveren lager et tilfeldig token på 32 byte og lagrer bare **SHA-256-hashen**.
   - Tokenet gjelder i **10 minutter** og kan brukes **én gang**.
   - Appen viser tokenet som QR-kode (`mittansvar://link?t=<token>`).
2. **Barnets enhet:** Barnet velger «Jeg har fått en QR-kode». Appen kaller `supabase.auth.signInAnonymously()`, skanner koden og kaller `redeem_link_token(token)`.
3. **`redeem_link_token`** er en `security definer`-funksjon. Den sjekker hash, utløpstid og om tokenet er brukt. Så setter den `members.auth_user_id = auth.uid()` og markerer tokenet som brukt.
4. Etter dette gir RLS barnets anonyme bruker tilgang som `child` i husstanden. Tilgangen er avgrenset til å lese og krysse av for seg selv.
5. **Frakobling** (tapt mobil): en voksen kaller `unlink_member_device(member_id)`, som setter `auth_user_id = null`. Den gamle sesjonen ser da ingenting, fordi RLS ikke finner noe medlem.

Hvorfor anonym auth i Supabase? Barnet får en ekte JWT, slik at *samme* RLS-regler gjelder overalt. Vi trenger verken e-post eller egne passord, og ikke noe hjemmelaget token-system for API-kall.

Nødvendige tiltak:
- Slå på «Anonymous sign-ins».
- Slå på CAPTCHA eller rate limiting mot misbruk.
- Anonyme brukere uten medlemskap ser ingenting. De kan ryddes bort med en jevnlig jobb senere.

Samme token-mekanisme brukes til å **invitere voksen nummer to** (`kind = 'adult'`). Den inviterte logger inn med e-post først og løser så inn tokenet. Da opprettes en ny `members`-rad med `role = 'adult'`.

### Felles husstandsvisning (kiosk)
- **MVP:** en *modus* på en voksens enhet. Sesjonen er fortsatt den voksnes, men skjermen `kiosk/` har:
  - avatarrad → oppgaveliste for valgt medlem → avkrysning
  - ingen navigasjon ut, og Androids tilbake-knapp er blokkert
  - «Avslutt» krever PIN
- **PIN:** 4 siffer, satt av en voksen. Den lagres **lokalt** som en hash i `expo-secure-store`, altså per enhet og ikke i databasen. Glemt PIN løses med ny innlogging med e-postkode.
- Avkrysning kaller `complete_task(task_id, completed_by_member_id)`. Databasen registrerer *hvem* som gjorde oppgaven (barnet) og *hvem som registrerte* den (den voksnes bruker-ID).
- **Begrensning, sagt ærlig:** kiosk-låsen er en UI-sperre. Et barn som på en eller annen måte kommer seg ut av skjermen, har den voksnes rettigheter. Det er en akseptabel risiko innad i en husstand. Anbefal brukerne å slå på iOS «Guidet tilgang» eller Androids «Fest app».
- **Senere:** et eget familienettbrett kan kobles med QR (`kind = 'shared_device'`) og få en egen, begrenset rolle. Det gjør vi ikke i MVP.

---

## 4. Abonnement per husstand (RevenueCat)

- **App User ID i RevenueCat = `household_id`.** Voksne kaller `Purchases.logIn(householdId)` etter innlogging. Et kjøp gjort av én voksen gjelder dermed hele husstanden. Barneenheter starter aldri RevenueCat.
- **Én entitlement, `premium`**, med to produkter (måned og år) i ett «offering».
- **Prøvetid:** `households.trial_ends_at = created_at + 14 dager`. Den settes av `create_household` og krever ikke kort.
- **Sannhetskilden for tilgang er Supabase, ikke klienten:**
  1. RevenueCat sender en webhook til Edge Function `revenuecat-webhook`.
  2. Funksjonen verifiserer den hemmelige `Authorization`-headeren.
  3. Funksjonen henter fersk status fra RevenueCats REST API (`GET /subscribers/{household_id}`) i stedet for å stole på rekkefølgen i hendelsene.
  4. Resultatet lagres med upsert i `household_subscriptions`.
- **Tilgang:** `private.household_has_access(hid)` = `trial_ends_at > now()` **eller** et aktivt abonnement. Klienten leser tilgangen via RPC. Det gjelder alle enheter, også barnas.
- **Håndheving:** i MVP sperrer vi *skriving* to steder: i RPC-en `complete_task` (den feiler med `subscription_required`) og i insert-policyen på `tasks`. Betalingsmuren vises i UI. Lesing er alltid tillatt.
- **Kanttilfeller:**
  - To voksne kjøper hver sin gang: vis «Husstanden har allerede abonnement» og skjul kjøpsknappen når status er aktiv.
  - Voksen bytter husstand: i RevenueCat settes restore-oppførselen til «Transfer to new App User ID». Et kjøp følger da den nye husstanden etter «Gjenopprett kjøp».
- **Expo Go:** `react-native-purchases` gjør ikke ekte kjøp i Expo Go. Betaling bygges derfor til slutt, i en EAS development build.
- **Personvern:** RevenueCat får bare `household_id` (en UUID), ingen navn eller e-post.

---

## 5. Sikkerhet og personvern

**Barns data (dataminimering)**
- Vi lagrer bare fornavn (eller kallenavn), innebygd avatar og fødselsår. Ingen e-post, bilder, fullt navn, fødselsdato eller posisjon.
- Barnet samtykker aldri selv. Det er den voksne som oppretter profilen, og GDPR art. 8 om barns samtykke kommer derfor ikke i spill.
- Ingen analyse- eller reklame-SDK-er i MVP. Hvis vi trenger analyse senere, velger vi en EU-basert løsning og holder barn utenfor.

**GDPR**
- **Behandlingsgrunnlag:** avtale med den voksne kontoeieren (art. 6(1)(b)).
- **Databehandleravtaler:** Supabase (EU-region). RevenueCat er amerikansk og krever SCC/DPF, men de får bare UUID. Apple og Google er selvstendige behandlingsansvarlige for betaling.
- **Personvernerklæring** på norsk før lansering. Den må også nevne barnedata.
- **Sletting:** «Slett konto» i appen kaller Edge Function `delete-account`. Den fjerner medlemskapet og brukeren i `auth.users`. Er det den siste voksne, slettes hele husstanden med `on delete cascade` (barneprofiler, oppgaver og historikk). Sletting av en barneprofil sletter også barnets fullføringer.
- **Innsyn og dataportabilitet:** i MVP manuelt på e-post. Eksport i appen kommer senere.
- **Logger:** ikke logg navn eller oppgavetekster i Edge Functions.

**Supabase / RLS**
- RLS er **på for alle tabeller** i `public`, uten unntak. Nye tabeller får RLS i samme migrasjon.
- Hjelpefunksjonene (`private.my_household_ids()` osv.) er `security definer` med `set search_path = ''`. De ligger i schemaet `private`, som ikke eksponeres i API-et.
- Kolonner som styrer tilgang (`members.auth_user_id`, `households.trial_ends_at`), kan ikke oppdateres fra klienten. Det håndheves med kolonnerettigheter.
- `service_role`-nøkkelen finnes bare i Edge Functions, aldri i appen eller i git.
- **RLS-tester (pgTAP)** kjøres før hver migrasjon deployes. De dekker minst: fremmed husstand ser ingenting, barn kan ikke redigere, og barn kan ikke krysse av for andre.
- Sesjonen lagres i `expo-secure-store`, ikke i AsyncStorage.

---

## 6. Implementeringsrekkefølge

Hvert steg tar 1–3 timer og kan testes på mobil før neste starter.

| # | Steg | Ferdig når |
|---|------|------------|
| 1 | Expo + TypeScript + expo-router, tomme faner | Appen kjører i Expo Go på mobilen |
| 2 | Supabase-prosjekt (EU), CLI, migrasjon: `households`, `members`, hjelpefunksjoner, RLS, pgTAP-oppsett | `supabase db reset` + tester er grønne |
| 3 | Innlogging med e-postkode, sesjon i SecureStore | Kan logge inn og ut |
| 4 | Oppstart: `create_household` (type, bolig, navn), legg til barneprofiler | Husstand og barn synes i appen |
| 5 | `tasks`: opprett, rediger, arkiver (uten gjentakelse), «I dag»-liste | Oppgaver kan lages og listes |
| 6 | `task_completions` + `complete_task` + historikk per oppgave | Avkrysning lagres som historikk |
| 7 | `computeNextDue` i TS med tester, begge gjentakelsesmodusene i UI | Testene grønne, fristen flyttes riktig |
| 8 | Maler: tabell og seed, forslag i oppstarten etter type, bolig og rolle | Nye husstander får relevante forslag |
| 9 | Årshjul-visning (oppgaver gruppert per måned) | 12 måneder vises med oppgaver |
| 10 | Tilbakemeldingstekster: tabell, seed, valg av tone, visning etter avkrysning | Tekst vises etter avkrysning |
| 11 | Lokale påminnelser for egne oppgaver | Varsel kommer på forfallsdagen |
| 12 | Invitere voksen nr. 2 (link-token, `kind = 'adult'`) | To voksne deler husstand |
| 13 | Kiosk-modus + PIN | Barn kan krysse av på en voksens mobil |
| 14 | QR-kobling av barnets enhet (anonym auth, `redeem_link_token`, frakobling) | Barnet ser og krysser av egne oppgaver |
| 15 | Sletting av konto og barneprofil + personvernerklæring | Alt forsvinner fra databasen |
| 16 | EAS development build, RevenueCat, webhook, `household_subscriptions`, betalingsmur | Testkjøp i sandbox gir tilgang |
| 17 | Lukket beta (TestFlight / intern testing) | 5–10 husstander bruker appen |

---

## 7. Åpne spørsmål du må ta stilling til

Mitt forslag står i parentes. Svarene påvirker datamodellen, så ta dem helst før steg 2.

1. **Boligtype ved oppstart?** (Ja: leilighet, rekkehus, enebolig.)
2. **Tildeling:** én ansvarlig eller «hvem som helst» i MVP, uten rundgang? (Ja.)
3. **Glemt kalenderoppgave:** én forfalt forekomst som ikke hoper seg opp? (Ja.)
4. **Prøvetid i appen uten kort, eller butikkens prøvetid med kort?** (I appen.)
5. **Etter utløpt abonnement:** skrivebeskyttet, eller helt låst? (Skrivebeskyttet.)
6. **Er alle voksne like, uten «eier»?** (Ja.)
7. **Barn med enhet:** skal de se hele husstandens oppgaver eller bare sine egne? (Hele, men bare krysse av egne.)
8. **Påminnelser i MVP?** (Ja, lokale varsler.)
9. **Innlogging:** bare e-postkode i MVP, med Apple og Google senere? (Ja.)
10. **Tone per husstand, eller per medlem** (humor for barn, fakta for voksne)? (Per husstand, som bestemt, men tekstene får målgruppe.)
11. **Hvem skriver og kvalitetssikrer maler og tilbakemeldingstekster?** AI-utkast + din gjennomgang? Hvor mange trengs til lansering?
12. **Delt omsorg:** er «én husstand per bruker» godt nok for lansering? (Ja.)
