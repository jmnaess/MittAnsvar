# MittAnsvar – arkitektur og analyse

Status: planlagt, beslutningene er tatt (se §7). Datamodell og RLS i detalj: se [DATABASE.md](DATABASE.md).

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
| 10 | Tilbakemeldingstekster | De må passe både for barn og voksne, og det trengs mange nok til at de ikke gjentas. Det er skrivearbeid. | Tekstene får målgruppe (barn/voksen/alle). 80–100 tekster til lansering (se §7). Fakta om sikkerhet (røykvarsler, el) må kvalitetssikres. |
| 11 | Innhold i årshjulet | Råd om el, brann og fukt kan gi ansvar hvis de er feil. | Korte, generelle tekster med henvisning til en fagperson. Lenk til offentlige kilder, f.eks. DSB. |
| 12 | Butikkregler | Apple krever sletting av konto i appen. De krever også «Logg inn med Apple» hvis Google-innlogging tilbys. | MVP: e-post med engangskode. Sletting i appen fra dag én. |
| 13 | Butikkavgift | 39 kr gir omtrent 33 kr etter Apple/Googles andel (15 % for små utviklere). | Meld deg på Small Business Program hos Apple og tilsvarende hos Google. |

**Tekniske risikoer**
- **Expo Go-begrensning.** RevenueCat (ekte kjøp) og fjern-push krever en *development build* med EAS, ikke Expo Go. Derfor kommer betaling sent i rekkefølgen. Alt annet kan testes i Expo Go.
- **Magic link.** Innlogging via e-postlenke er knotete med dyplenker i Expo Go. Bruk heller en 6-sifret engangskode (OTP) på e-post.
- **Tidssoner.** Frister lagres som `date` i husstandens tidssone (`Europe/Oslo`), ikke som tidspunkt. Da slipper vi feil rundt midnatt og sommertid. Serveren setter utførelsesdatoen og beregner neste frist i husstandens tidssone, så klokken på mobilen spiller ingen rolle.

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
- **Operasjoner som endrer flere tabeller, går gjennom én RPC-funksjon** (`create_household`, `complete_task`, `accept_invite`, `redeem_link_token`). Da blir de atomiske, og reglene ligger på ett sted.
- **Edge Functions bare når vi trenger hemmeligheter eller admin-rettigheter:** RevenueCat-webhook og sletting av brukere i `auth.users`.
- **Ingen global state-manager.** TanStack Query holder serverdata. Lokal UI-tilstand holdes med `useState`.
- **Gjentakelseslogikken ligger i databasen** (`private.compute_next_due`, SQL med pgTAP-tester). `complete_task` beregner neste frist selv, og årshjulet henter fremtidige forekomster via RPC. Regelen finnes ett sted, og klienten kan ikke sende en feil frist.
- **Supabase CLI med migrasjoner i git.** Ingen endringer via Dashboard. Typer genereres med `supabase gen types`.

**Mappestruktur**

```
app/                          # expo-router: kun skjermer, tynne
  _layout.tsx
  sign-in.tsx
  (app)/_layout.tsx               # uten husstand → onboarding, med husstand → fanene
  (app)/onboarding.tsx            # velg: opprett (husstand → barn) eller bli med (kode, navn, avatar); forslag senere
  (app)/(tabs)/index.tsx          # «I dag»: øverst «Til godkjenning», nederst «Ledige jobber»
  (app)/(tabs)/tasks.tsx          # alle oppgaver (finn og endre); voksne sveiper for «Slett» med «Angre»
  (app)/(tabs)/year.tsx           # Årshjul: 12 måneder med maler og brytere, egne årlige oppgaver, «+»
  (app)/year-task/new.tsx         # «Ny årlig oppgave»: én eller flere måneder
  (app)/(tabs)/household.tsx      # medlemmer med saldo og «Egen enhet», legg til barn, inviter voksen
  (app)/(tabs)/settings.tsx       # husstandsnavn, tone, konto
  (app)/child/new.tsx             # legg til barn
  (app)/child/[id].tsx            # endre / slette barn
  (app)/earnings/[id].tsx         # barnets side: saldo, historikk, «Registrer utbetaling», koble til / fra enhet
  (app)/child/link/[id].tsx       # QR-kode og kode for barnets enhet (steg 10a)
  (app)/link-device.tsx           # barnets enhet, ikke koblet: skann QR eller tast kode
  (app)/(child)/index.tsx         # barnets enhet: «Mine oppgaver i dag» og «Ledige jobber»
  (app)/(child)/my-earnings.tsx   # barnets enhet: «Min lønn»
  (app)/(child)/my-settings.tsx   # barnets enhet: navn, avatar, «Logg ut av denne enheten»
  (app)/task/[id].tsx
  (app)/task/new.tsx
  (app)/job/new.tsx               # «Ny ledig jobb» (kort skjema) fra «+» i «I dag»
  (app)/job/[id].tsx              # endre jobb (langt trykk i «I dag»)
  kiosk/index.tsx                 # felles husstandsvisning
  paywall.tsx
src/
  lib/            supabase.ts, queryClient.ts, errors.ts (unwrap + norske feilmeldinger), dates.ts
  features/
    auth/         api.ts, hooks.ts
    household/    api.ts, hooks.ts, inviteCode.ts, components/
    tasks/        api.ts, hooks.ts, recurrence.ts, reward.ts, job.ts (jobbskjema, hvilke barn),
                  groupToday.ts, childToday.ts (barnets «I dag»), components/
    completions/  api.ts, hooks.ts, chooseDoer.ts (hvem gjorde det, testes), components/MemberPickerModal.tsx
    rewards/      api.ts, hooks.ts, format.ts (saldo med «venter»), components/ (PayoutModal, RewardEventRow,
                  PendingApprovalBanner)
    templates/    api.ts, hooks.ts, suggest.ts (filter, egne årlige oppgaver, månedsgruppering),
                  components/ (TemplateRow, OwnYearTaskRow)
    feedback/     components/FeedbackToast.tsx (teksten velges i complete_task)
    kiosk/        pin.ts, components/
    devices/      api.ts, hooks.ts, linkCode.ts (QR-innhold, normalisering), components/ (QrScanner, LinkCodeCard)
    subscription/ revenuecat.ts, useAccess.ts
    notifications/ plan.ts + text.ts (rene, testes), schedule.ts (expo-notifications), settings.ts,
                  permissions.ts, hooks.ts, components/ (ReminderPrompt, ReminderSettingsSection)
                  __tests__/ (Jest: npm test)
  ui/             designsystemet: theme.ts (tokens), tabOptions.tsx (fanelinje og headere) og alle
                  felles komponenter (Text, Card, TaskRow, ListRow, TextField, Sheet, Avatar …).
                  Se docs/DESIGN.md
  types/database.ts               # generert, ikke rediger
supabase/
  migrations/                     # SQL, én fil per endring
  functions/revenuecat-webhook/
  functions/delete-account/
  seed/feedback.sql               # steg 12. Maler og tekster som skal til prod, legges inn via migrasjon
  tests/rls.test.sql              # pgTAP: RLS-tester
  tests/compute_next_due.test.sql # pgTAP: gjentakelse, månedsoppgaver (månedsskifte, årsskifte)
  tests/templates.test.sql        # pgTAP: maler, aktivering, «Denne måneden», angring
  tests/tasks.test.sql            # pgTAP: tasks, trigger, today_tasks
  tests/complete_task.test.sql    # pgTAP: avkrysning, angring, tone, tidssone
  tests/invites.test.sql          # pgTAP: invitasjon av voksen, sperre, RLS
  tests/upcoming_occurrences.test.sql # pgTAP: fremtidige forekomster (påminnelser, senere årshjul)
  tests/rewards.test.sql          # pgTAP: lønn, utbetalinger, saldo, ledige jobber
  tests/job_members.test.sql      # pgTAP: jobber for utvalgte barn
  tests/child_devices.test.sql    # pgTAP: barnets enhet, kode, frakobling, hva barn ser og kan krysse av
  tests/child_settings.test.sql   # pgTAP: barnets avatar og utlogging (kobler fra seg selv)
  tests/reward_approval.test.sql  # pgTAP: godkjenning av lønn, avvisning, saldo og utbetaling
docs/
```

Hver `feature` eier sine egne API-kall og hooks. Skjermene i `app/` setter bare sammen komponenter.

---

## 3. Barneprofiler, QR-kobling og felles visning

### Barneprofil
- En rad i `members` med `role = 'child'`, `display_name`, `avatar` (nøkkel til en innebygd illustrasjon, aldri et bilde) og `birth_year`.
- **Ingen e-post og ingen konto.** `auth_user_id` er `null` til en enhet blir koblet til.
- Det er bare voksne i husstanden som kan opprette, endre og slette barneprofiler.

### Barn med egen enhet (QR eller kode, steg 10a)
1. **Voksen:** «Husstand» → trykk på barnet → «Koble til enhet» (`app/(app)/child/link/[id].tsx`). Appen kaller `create_link_token(member_id)`.
   - Serveren lager en kode på **8 tegn** (samme alfabet som invitasjoner) og lagrer bare **SHA-256-hashen**.
   - Koden gjelder i **10 minutter** og kan brukes **én gang**. Bare den nyeste koden per barn gjelder.
   - Appen viser koden som QR-kode (`mittansvar://link?code=ABCDEFGH`) og som tekst (`ABCD-EFGH`), med nedtelling og «Lag ny kode». Skjermen henter medlemmene hvert 3. sekund og viser «Koblet til!» når barnet er koblet.
   - Ett barn har én enhet. Er barnet koblet, vises «Koble fra» i stedet (`already_linked` fra databasen).
2. **Barnets enhet:** Barnet trykker «Jeg er et barn» på innloggingsskjermen. Appen kaller `supabase.auth.signInAnonymously()`. Anonym bruker uten husstand får skjermen «Koble til» (`app/(app)/link-device.tsx`): skann med `expo-camera` eller tast inn koden. «Avbryt» logger ut.
3. **`redeem_link_token(code)`** er en `security definer`-funksjon. Den sjekker hash, utløpstid og om koden er brukt, og godtar bare anonyme brukere. Så setter den `members.auth_user_id = auth.uid()` og markerer koden som brukt. Feil kode gir samme svar som utløpt og brukt (`link_invalid`). Maks 5 feil per 15 minutter.
4. Etter dette gir RLS barnets anonyme bruker tilgang som `child` i husstanden. Appen viser barnets egne faner (`app/(app)/(child)/`): «I dag» med «Mine oppgaver i dag» (egne og felles) og «Ledige jobber» (for alle barna eller for barnet), «Min lønn», og «Innstillinger» med navnet (bare visning), ny avatar (`set_my_avatar`) og «Logg ut av denne enheten». Ingen redigering av oppgaver eller husstanden, ingen påminnelser.
5. **Hva databasen håndhever for barn:** krysse av bare egne og felles oppgaver og jobber som gjelder barnet (`complete_task`), se bare egne avkrysninger, utbetalinger og egen saldo (RLS og `member_balances`). Barnet kan fortsatt lese hele husstandens oppgaveliste (beslutning 7), men appen viser bare det barnet kan krysse av.
6. **Frakobling** (tapt mobil, nytt nettbrett): «Koble fra» på barnets side kaller `unlink_member_device(member_id)`. Den setter `auth_user_id = null` og sletter den anonyme brukeren i `auth.users`, med sesjoner og refresh-token. Barnets app ser at husstanden er borte og logger ut lokalt. Senest når tokenet skal fornyes, er sesjonen uansett ugyldig. Historikk og saldo beholdes på barneprofilen.
7. **Utlogging fra barnets enhet:** «Logg ut av denne enheten» (med bekreftelse: «Du blir logget ut, og en voksen må koble til enheten på nytt.») kaller `unlink_my_device()`, som gjør det samme som frakobling for barnet selv, og logger så ut lokalt.

Hvorfor anonym auth i Supabase? Barnet får en ekte JWT, slik at *samme* RLS-regler gjelder overalt. Vi trenger verken e-post eller egne passord, og ikke noe hjemmelaget token-system for API-kall.

Nødvendige tiltak:
- Slå på «Anonymous sign-ins» (Dashboard → Authentication → Sign In / Providers). Lokalt: `enable_anonymous_sign_ins = true` i `supabase/config.toml`.
- Anonyme innlogginger er begrenset per IP (standard 30 per time). CAPTCHA (f.eks. Turnstile) bør slås på før lansering.
- Anonyme brukere uten medlemskap ser ingenting, og kan ikke opprette husstand eller bli med som voksen. Brukere som avbrøt koblingen, kan ryddes bort med en jevnlig jobb senere.

### Invitere voksen nummer to (steg 6)
Samme mønster som QR-tokenet (bare hash, engangsbruk, utløp, RPC), men i egen tabell `invites` med en kort kode som kan skrives for hånd. Detaljer: [DATABASE.md §1](DATABASE.md#invites-invitasjon-av-voksen-steg-6).
1. **Voksen:** fanen «Husstand» → «Inviter voksen». `create_invite` gir en kode på 8 tegn (f.eks. `ABCD-EFGH`) som gjelder i **48 timer** og kan brukes **én gang**. Appen åpner delingsmenyen med en kort tekst: last ned appen, logg inn, skriv inn koden.
2. **Den inviterte:** logger inn med e-postkode. Uten husstand vises «Opprett husstand» og «Bli med i en husstand». Det siste ber om kode, navn og avatar og kaller `accept_invite`, som legger brukeren til som `adult`.
3. Koden vises bare én gang. Aktive invitasjoner listes med utløpstid og kan trekkes tilbake (raden slettes).
4. **Sperre:** maks 5 feilede forsøk per bruker per 15 minutter. Feil, utløpt, brukt og tilbaketrukket kode gir samme melding (`invite_invalid`), så vi ikke røper hvilken.

Ikke ennå: fjerne en annen voksen, lenker inn i appen.

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
- Vi lagrer bare fornavn (eller kallenavn), innebygd avatar og fødselsår, og eventuelt et profilbilde. Ingen e-post, fullt navn, fødselsdato eller posisjon.
- **Profilbilde (valgfritt):** legges inn av en voksen, aldri av barnet. Det ligger i en privat bøtte i EU som bare husstanden kan lese (RLS), og vises via signerte URL-er som varer i én time. Bildet krympes til 512×512 på enheten, og EXIF (posisjon) fjernes før opplasting. Det slettes når bildet fjernes, når personen fjernes og når kontoen eller husstanden slettes. Se DATABASE.md §6.
- Barnet samtykker aldri selv. Det er den voksne som oppretter profilen, og GDPR art. 8 om barns samtykke kommer derfor ikke i spill.
- Ingen analyse- eller reklame-SDK-er i MVP. Hvis vi trenger analyse senere, velger vi en EU-basert løsning og holder barn utenfor.
- Barnets enhet har en anonym Supabase-bruker uten e-post eller andre opplysninger.

**GDPR**
- **Behandlingsgrunnlag:** avtale med den voksne kontoeieren (art. 6(1)(b)).
- **Databehandleravtaler:** Supabase (EU-region). RevenueCat er amerikansk og krever SCC/DPF, men de får bare UUID. Apple og Google er selvstendige behandlingsansvarlige for betaling.
- **Personvernerklæring** på norsk før lansering. Den må også nevne barnedata.
- **Sletting:** «Slett konto» i appen kaller Edge Function `delete-account`. Den fjerner medlemskapet og brukeren i `auth.users`. Er det den siste voksne, slettes hele husstanden med `on delete cascade` (barneprofiler, oppgaver og historikk), og barnas anonyme brukere slettes, så enhetene deres logges ut. Sletting av en barneprofil sletter også barnets fullføringer og utbetalinger. **Profilbilder** slettes med Storage-API-et før radene, fordi databasen ikke kan slette filer: appen sletter barnets bildemappe før profilen, og `delete-account` sletter mappene som forsvinner med kontoen (hele husstanden for siste voksne) før `delete_my_account_data`. Se DATABASE.md §6. Når en voksen sletter seg og andre voksne er igjen, beholdes barnas historikk: `recorded_by`, `created_by` og `recorded_by_member_id` settes til null. Feiler slettingen av auth-brukeren med en serverfeil, prøver funksjonen én gang til. En bruker som da står uten husstand, finner «Slett konto» også på oppstartsskjermen.
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

Hvert steg tar 3–6 timer og kan testes på mobil før neste starter. Med 5–10 timer i uka blir det omtrent ett steg per uke.

| # | Steg | Ferdig når |
|---|------|------------|
| 1 | Expo + TypeScript + expo-router, tomme faner | Appen kjører i Expo Go på mobilen |
| 2 | Supabase-prosjekt (EU), CLI, migrasjon: `households`, `members`, hjelpefunksjoner, RLS, pgTAP-oppsett | `supabase db reset` + tester er grønne |
| 3 | Innlogging med e-postkode, sesjon i SecureStore | Kan logge inn og ut |
| 4 | Oppstart: `create_household` (type, bolig, navn), legg til barneprofiler | Husstand og barn synes i appen |
| 5a | `tasks` med begge gjentakelsesmodusene, `compute_next_due` (pgTAP), oppgaveskjema og fanen «Oppgaver» | Oppgaver kan lages, endres og slettes, fristen stemmer |
| 5b | `task_completions`, `complete_task`/`undo_completion`, et startsett tilbakemeldingstekster, «I dag» med avkrysning, tilbakemelding og angring | Avkrysning lagres som historikk, fristen flyttes og kan angres |
| 6 | *Gjort:* invitere voksen nr. 2 (se steg 14). Gjenstår: historikk per oppgave | |
| 7 | *Gjort:* årshjul med maler. `task_templates` med 25 maler, `activate_templates`, månedsoppgaver (frist = måned, se [DATABASE.md §2](DATABASE.md#månedsoppgaver-steg-7)), fanen «Årshjul» med brytere og «Velg anbefalte», «Denne måneden» i «I dag» | Mal aktiveres, vises i «Denne måneden» uten å være forfalt, og neste frist blir samme måned neste år |
| 8 | *Gjort:* lokale påminnelser (se steg 13 og §9). Gjenstår: egen familie tar appen i bruk hjemme | Familien har brukt appen daglig i minst én uke, og funnene er notert og prioritert |
| 9 | Lønn per oppgave og jobbtavle (se §10). `tasks.reward_nok`, beløpet kopieres til `task_completions.reward_nok`, `payouts`, `record_payout`, `member_balances`, `recurrence_type = 'job'` med `job_repeats`. Skjema: «Lønn (kr)» og «Ledig jobb», «Ledige jobber» i «I dag», saldo og utbetaling under «Husstand» | `npm run db:test` er grønn. På mobilen: 10 kr på en oppgave gir «+10 kr» og saldo, en engangsjobb forsvinner, en gjentakende jobb blir stående, angring trekker fra, og utbetaling gir saldo 0 |
| 10a | Barnas egen enhet (tidligere steg 16, se §3): anonym innlogging, `link_tokens` med kort kode og QR, `redeem_link_token`, frakobling som sletter den anonyme brukeren, barnets faner («I dag», «Min lønn»), innstramming av hva barn ser og kan krysse av | Et barn kobler til med QR på sin enhet, ser sine oppgaver og jobber, krysser av og ser sin egen saldo |
| 10b | Godkjenning av lønn (se §10): `task_completions.status`, «Til godkjenning» i «I dag», godkjent saldo for utbetaling | Barnets avkrysning med lønn «venter», en voksen godkjenner én og avviser én, den avviste er tilbake hos barnet og pengene er trukket, og utbetaling tillater bare godkjent beløp |
| 11 | *Gjort:* årshjulet viser også egne årlige oppgaver (én gang i året i en bestemt måned, ikke fra mal), merket «Egen». Gruppert på `tasks.month`, så `get_upcoming_occurrences` trengs ikke her. «+» øverst til høyre (voksne) åpner «Ny årlig oppgave»: tittel, ansvarlig, lønn og flere måneder, som blir én månedsoppgave per måned i ett insert-kall | Egne og malbaserte oppgaver vises i samme 12 måneder |
| 12 | Tilbakemeldingstekster: utvid startsettet fra 5b til 80–100 tekster, flytt til `seed/feedback.sql`, tekster per mal | Tekstene gjentas sjelden og passer oppgaven |
| 13 | *Gjort i steg 8:* lokale påminnelser (`get_upcoming_occurrences`, daglig oppsummering, månedsoppgaver) | Varsel kommer på forfallsdagen |
| 14 | *Gjort i steg 6:* invitere voksen nr. 2 (`invites`, kode på 8 tegn) | To voksne deler husstand |
| 15 | Kiosk-modus + PIN | Barn kan krysse av på en voksens mobil |
| 16 | Flere maler (daglige og ukentlige rutiner, `audience`, `min_age`), forslag i oppstarten etter type, bolig og rolle (tidligere steg 10). QR-kobling er gjort i steg 10a | Nye husstander får relevante forslag |
| 17 | Sletting av konto og barneprofil + personvernerklæring | Alt forsvinner fra databasen |
| 18 | EAS development build, RevenueCat, webhook, `household_subscriptions`, betalingsmur | Testkjøp i sandbox gir tilgang |
| 19 | Lukket beta (TestFlight / intern testing) | 5–10 husstander bruker appen |

---

## 7. Beslutninger

Tatt 29.09.2026. Alle forslagene fra analysen i §1 er godkjent.

1. **Boligtype ved oppstart:** ja – leilighet, rekkehus eller enebolig.
2. **Tildeling:** én ansvarlig eller «hvem som helst». Ingen rundgang i MVP.
3. **Glemt kalenderoppgave:** én forfalt forekomst vises til den er utført. Ingen opphopning.
4. **Prøvetid:** i appen, uten kort.
5. **Etter utløpt abonnement:** skrivebeskyttet. Ingen data slettes.
6. **Voksne:** alle er like, ingen «eier».
7. **Barn med enhet:** ser hele husstandens oppgaver, men krysser bare av egne.
8. **Påminnelser:** lokale varsler i MVP. Én daglig oppsummering per bruker og enhet, se §9.
9. **Innlogging:** bare e-postkode i MVP. Apple og Google kommer senere.
10. **Tone:** velges per husstand. Tekstene har målgruppe (barn, voksen eller alle).
11. **Innhold:** AI lager utkast, og utvikleren går gjennom alt manuelt. Til lansering: **40–60 maler** og **80–100 tilbakemeldingstekster**. Sikkerhetsfakta (røykvarsler, el) sjekkes mot offentlige kilder.
12. **Delt omsorg:** én husstand per bruker holder til lansering.
13. **Neste frist beregnes i databasen**, ikke i klienten. `complete_task` tar ikke imot frist eller dato. Se [DATABASE.md §2](DATABASE.md#2-gjentakelse-fast-kalender-og-intervall).
14. **Lønn (steg 9, tatt 17.11.2026):** voksne kan sette et beløp i hele kroner på en oppgave. Bare barn får lønn. Beløpet kopieres til avkrysningen, så en senere prisendring ikke endrer det som er tjent. Utbetaling registreres av en voksen og kan ikke være større enn saldoen. Selve betalingen skjer utenfor appen (ingen Vipps). Se §10.
15. **Barnas enhet og godkjenning (steg 10, tatt 17.11.2026):** én kort kode (QR eller inntasting) kobler barnets anonyme bruker til barneprofilen. Ett barn har én enhet. Barnets avkrysninger med lønn må godkjennes av en voksen. Saldoen som vises, tar med det som venter, men bare godkjent beløp kan betales ut. Se §3 og §10.

---

## 8. Måling uten analyseverktøy

Vi har ingen analyse-SDK (se §5). Det viktigste spørsmålet – *bruker husstandene appen etter oppstart?* – kan likevel besvares med tall vi allerede har: `households.created_at` og `task_completions.completed_on`.

Spørringen under viser hvor mange husstander som krysset av minst én oppgave i uke 1, 2 og 4 etter oppstart. Uke 1 er dag 0–6 regnet fra opprettelsesdatoen, uke 2 er dag 7–13 og uke 4 er dag 21–27. En husstand telles bare med for en uke når hele uken er over, ellers blir prosenten for lav.

```sql
-- Kjøres i Supabase SQL Editor. Gir bare antall, ingen navn eller oppgavetekster.
with h as (
  select id,
         (created_at at time zone timezone)::date as start_on,
         (now()      at time zone timezone)::date as today
  from public.households
),
activity as (
  select distinct c.household_id,
         (c.completed_on - h.start_on) / 7 + 1 as week_no   -- dag 0–6 = uke 1
  from public.task_completions c
  join h on h.id = c.household_id
)
select w.week_no                                                 as uke,
       count(*)                                                  as husstander,
       count(a.household_id)                                     as aktive,
       round(100.0 * count(a.household_id) / nullif(count(*), 0)) as prosent
from h
cross join (values (1), (2), (4)) as w(week_no)
left join activity a on a.household_id = h.id and a.week_no = w.week_no
where h.today >= h.start_on + w.week_no * 7   -- bare husstander der uken er over
group by w.week_no
order by w.week_no;
```

Merk:
- Egne testhusstander bør filtreres bort, f.eks. med `and h.id not in (...)` i `where`.
- Slettede husstander forsvinner (`on delete cascade`), så tallene gjelder bare husstander som fortsatt finnes.
- En angret avkrysning slettes og teller ikke.

---

## 9. Påminnelser (lokale varsler, steg 8)

Varslene planlegges på telefonen med `expo-notifications`. Det virker i Expo Go, også på Android (der er det bare push fra server som mangler). Det sendes ingen push fra server, ingen varsler til barnas enheter og ingen varsler når andre krysser av.

**Hva som sendes.** Maks ett varsel per dag, på tidspunktet brukeren har valgt (standard kl. 07:30, enhetens lokale tid):

```
I dag: Søppel, Rense sluk + 2 forfalt
Denne måneden: Rense takrenner
```

- **Forfaller i dag:** oppgaver med en forekomst den dagen. Månedsoppgaver er ikke med her.
- **Forfalt:** fristen er passert, og oppgaven har ikke en ny forekomst den dagen. En månedsoppgave er først forfalt etter siste dag i måneden sin (som `due_by`). Forfalte oppgaver nevnes bare som antall. Er det *bare* forfalte, blir teksten «2 forfalte oppgaver venter».
- **Månedsoppgaver:** nevnes den 1. («Denne måneden: …») og første dag i siste uke, altså siste dag − 6 («Fortsatt denne måneden: …»), hvis de fortsatt ikke er gjort. Linjen slås sammen med dagsoppsummeringen.
- Maks 4 titler, deretter «og 3 til». Er det ingenting å si, sendes ikke noe varsel den dagen.
- **Omfang:** «Mine og felles» er oppgaver til meg og oppgaver uten ansvarlig. «Hele husstanden» er alle.
- Trykk på varselet åpner «I dag» (`data.url = '/'`, håndtert i `useOpenTodayOnTap`).

**Hvordan.**
1. Databasen gir forekomstene de neste 7 dagene (`get_upcoming_occurrences`, se [DATABASE.md §2](DATABASE.md#2-gjentakelse-fast-kalender-og-intervall)). Regelen for gjentakelse finnes dermed fortsatt bare ett sted.
2. `plan.ts` og `text.ts` er rene funksjoner. De tar oppgaver, forekomster, innstillinger, «i dag» og mitt medlem, og gir en liste `{ date, hour, minute, body }`. De er testet med Jest (`npm test`), også månedsoppgaver, årsskifte, skuddår og dager uten oppgaver.
3. `schedule.ts` fjerner **alle** planlagte varsler og planlegger listen på nytt. Varsler med et tidspunkt som har passert, hoppes over. Kallene står i kø, så to planlegginger aldri går samtidig.

**Når det planlegges på nytt.** `useReminderSync` er montert i fanene. Den kjører når appen åpnes, når den kommer i forgrunnen, når innstillingene endres, og når oppgavene endres. Opprett, endre, slett, kryss av og angre invaliderer allerede `['tasks', householdId]`, og forekomstene ligger under den samme nøkkelen. Derfor trengs ingen egne kall i mutasjonene.

**Modellen er «ingenting blir gjort».** Planen antar at ingen krysser av før dagen kommer. Krysser jeg av, planlegges det på nytt med en gang. **Kjent begrensning:** krysser en annen voksen av på sin mobil, står oppgaven fortsatt i mitt varsel til neste gang min app åpnes. Å fikse det krever push fra server, og det kommer senere.

**Innstillinger** lagres per bruker på enheten i `secureStorage` (`reminders.<userId>`), ikke i databasen: av/på, tidspunkt og omfang. Ved utlogging og sletting av konto fjernes alle planlagte varsler.

**Tillatelse.**
- Vi spør ikke ved første oppstart. Når husstanden er opprettet, eller brukeren har blitt med, setter oppstarten et flagg (`reminders.prompt.<userId>`). Fanene viser da «Vil du få beskjed om dagens oppgaver?» med knappene «Ja takk» og «Ikke nå».
- Først ved «Ja takk» vises systemdialogen. Sier brukeren ja, slås påminnelser på med standardverdiene.
- Har brukeren sagt nei i systemet (`canAskAgain = false`), viser både spørsmålet og Innstillinger en forklaring og knappen «Åpne innstillinger» (`Linking.openSettings`). Tillatelsen leses på nytt når appen kommer tilbake i forgrunnen.
- Android krever en varselkanal (`reminders`, «Påminnelser»). Den lages før vi spør, fordi Android 13+ ikke viser dialogen uten.

---

## 10. Lønn og ledige jobber (steg 9)

Barn kan tjene penger på oppgaver. Appen holder bare regnskapet. Selve betalingen gjør familien selv. Datamodell: [DATABASE.md §1–3](DATABASE.md#3-task_completions-og-historikk).

**Lønn per oppgave**
- En voksen setter «Lønn (kr)» i oppgaveskjemaet (valgfritt, 1–10 000). Feltet vises bare for voksne, og RLS på `tasks` gjør at bare voksne kan skrive det.
- `complete_task` kopierer beløpet til avkrysningen når den som gjorde oppgaven er et barn. Voksne får `null`. Banneret viser da «+10 kr til Leah».
- Angring sletter avkrysningen, og beløpet forsvinner med den.
- **Saldo** = sum av beløp på avkrysninger − sum av utbetalinger (view `member_balances`). Den vises under hvert barn i fanen «Husstand».

**Hvem gjorde det?** (`completions/chooseDoer.ts`)
- Vanlige oppgaver uten lønn: ett trykk, som før.
- En voksen trykker på en oppgave med lønn som er tildelt et barn: velgeren viser barnet (forhåndsvalgt) og «meg», og «Kryss av» bekrefter. Ellers kunne barnet fått betalt for noe en voksen gjorde.
- Jobb for flere barn (eller alle): velg hvilket av dem som gjorde den. Jobb for ett barn: som en oppgave tildelt barnet. Et barn på egen enhet krysser av for seg selv.

**Ledige jobber**
- `recurrence_type = 'job'`: ingen dato, `next_due_on` er alltid `null`. Jobben blir aldri forfalt og er ikke med i påminnelsene.
- Engangsjobb: arkiveres når den er gjort, og angring legger den tilbake. Gjentakende jobb («Kan gjøres flere ganger»): blir stående.
- For alle barna, ett barn eller flere utvalgte barn (`tasks.job_member_ids`, tom = alle). Vises nederst i «I dag» under «Ledige jobber», med beløp og «Leah og Ola» / «Alle barna».
- Voksne legger ut jobber med «+» øverst i «I dag» (kort skjema: hva, lønn, for hvem, «Kan gjøres flere ganger») og endrer dem med langt trykk. Seksjonen vises alltid for voksne, også tom. Barn ser den bare når det finnes jobber. Det fulle oppgaveskjemaet kan også lage jobber.

**Utbetaling.** Trykk på et barn under «Husstand» åpner `earnings/[id]`: saldo, de siste 20 avkrysningene med lønn og utbetalinger, og «Registrer utbetaling». Beløpet er forhåndsutfylt med den godkjente saldoen, kan endres, og må bekreftes. `record_payout` avviser beløp over godkjent saldo.

**Godkjenning av lønn (steg 10b).** Et barn kan krysse av på sin egen enhet. Da må en voksen godkjenne pengene.
- **Tilstand per avkrysning:** venter, godkjent eller ikke godkjent (`task_completions.status`). Krysser et barn av en oppgave med lønn på egen enhet, blir den «venter». Avkrysninger uten lønn, og alt en voksen registrerer, er godkjent med én gang.
- **Saldoen** øker med én gang og viser hva som venter: «35 kr (10 kr venter)» = 25 godkjent + 10 venter. Slik vises den under «Husstand», på barnets side og i «Min lønn». Bare godkjent beløp kan betales ut. Utbetalingen viser hvor mye som venter.
- **«Til godkjenning»** øverst i de voksnes «I dag» når noe venter: avatar, oppgave og beløp, med «Godkjenn» og «Ikke godkjent» per rad og «Godkjenn alle». «Ikke godkjent» bekreftes.
- **«Ikke godkjent»** betyr at oppgaven ikke er gjort: beløpet trekkes, fristen settes tilbake hvis det var siste avkrysning, og en engangsjobb blir ledig igjen. I historikken står «Ikke godkjent» med gjennomstreket beløp, så barnet ser det. Barnet kan gjøre oppgaven på nytt.
- Barnet kan fortsatt angre sin egen avkrysning innen 10 minutter. Banneret viser «+10 kr – venter på godkjenning».
- Ikke i dette steget: barn som melder inn egne ekstra jobber, push-varsler om ting som venter, felles mål.

**Kjent kanttilfelle:** en utbetaling, og så en angring innen 10 minutter, kan gi negativ saldo. Det godtar vi.

**Ikke i steg 9:** felles mål, Vipps eller annen betaling. Godkjenning og barnas egne enheter kom i steg 10.
