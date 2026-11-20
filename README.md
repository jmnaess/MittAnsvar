# MittAnsvar
App for husstander der alle tar sin del: daglige oppgaver, ekstrajobber med lønn og et årshjul for vedlikehold.

**Visjon og rettesnor for tekst og nye funksjoner:** [docs/VISJON.md](docs/VISJON.md).

## Misbruksvern for anonym innlogging (20. november 2026)

- **Hvorfor:** barnets enhet og familieskjermen logger inn anonymt før koden løses inn. Hvem som
  helst kan dermed lage anonyme brukere.
- **Nå:** en timesjobb (pg_cron, minutt 35) sletter anonyme brukere som er eldre enn 24 timer og
  ikke er koblet som barn eller familieskjerm. Brukere med e-post og koblede enheter røres aldri.
  Se docs/DATABASE.md §5.
- **Før offentlig lansering:** slå på CAPTCHA (hCaptcha eller Turnstile, `[auth.captcha]`), og
  sjekk grensen for anonyme innlogginger per IP (lokalt 30 per time) i Supabase-dashbordet.

## Familieskjerm (19. november 2026)

- **Hva:** et nettbrett på kjøkkenet viser dagens oppgaver for hele husstanden, med ett kort per
  person. Alle kan krysse av der, og angre innen 10 minutter.
- **Koble til:** en voksen velger «Husstand» → «Legg til familieskjerm». På nettbrettet: «Sett opp
  familieskjerm», og skann koden eller skriv den inn. Enheten trenger ingen konto.
- **Begrenset:** skjermen kan ikke godkjenne, redigere, slette eller se saldo. Oppgaver med lønn
  blir «venter». Det finnes ingen utlogging på skjermen: en voksen kobler den fra under «Husstand».
- **Liggende:** iPad kan stå begge veier, og hele appen roterer der. iPhone er fortsatt stående.
  Dette virker først i et EAS-bygg, ikke i Expo Go.
- **Våken skjerm:** slås av og på under tannhjulet på skjermen.

## Nytt i «I dag» (18. november 2026)

- **Rette avkrysninger:** voksne kan trykke på en utført oppgave hele dagen og velge
  «Ikke gjort» eller «Endre hvem» som gjorde den. Barn kan fortsatt angre egne avkrysninger
  innen 10 minutter.
- **Utsett til:** voksne kan utsette en oppgave til en senere dato. Den forsvinner fra «I dag»
  og kommer tilbake på den nye datoen, med «Angre» rett etterpå.
- **Færre utførte synlige:** hvert kort viser de 2 sist utførte og fremdrift («3 av 7»).
  Resten ligger bak «4 til gjort i dag», som kan foldes ut. Ved midnatt er «I dag» tom igjen.
- **Personvisning:** trykk på en person i familieraden. Da vises personens kort, «Kommende»
  (8 uker, gruppert per uke, daglige og ukentlige oppgaver én gang) og «Gjort siste 3 dager».
  Voksne kan trykke på en kommende oppgave for å endre den. Barnet ser det samme for seg selv
  på egen enhet, men «Kommende» viser bare 2 uker og ikke de hyppige oppgavene.

## Profilbilder (20. november 2026)

- **Bilde i stedet for figur:** en voksen kan ta eller velge et bilde for alle i husstanden,
  også barna. Bildet beskjæres kvadratisk og vises overalt der figuren vises, med samme ring
  og farger. Barn: «Endre barn». Voksne: trykk på personen under «Husstand».
- **Barnet velger:** på egen enhet kan barnet velge «Figur» eller «Bilde» under Innstillinger,
  men ikke laste opp eller slette.
- **Fjerne:** en voksen kan fjerne bildet, og figuren kommer tilbake.
- **Personvern:** bildet krympes til 512×512 og lagres uten posisjon (EXIF) i en privat bøtte
  i EU som bare husstanden kan lese. Det slettes når personen fjernes, og når kontoen eller
  husstanden slettes. Se `docs/DATABASE.md` §6.
- **Expo Go:** alt virker der. Egen tekst i dialogen for kamera- og bildetilgang kommer først i
  et ekte bygg.

## Sesongoppgaver (19. november 2026)

- **Bare deler av året:** gjentakende oppgaver (fast dag eller etter sist utført) kan begrenses
  til en periode i hele måneder, også over nyttår. Velges under «Gjentas» i oppgaveskjemaet.
  Teksten blir f.eks. «1 uke etter sist · mai–sep». Årlige oppgaver har allerede en måned og
  kan ikke ha periode.
- **Utenfor perioden** finnes ingen forekomster, verken i «I dag», «Kommende» eller påminnelser.
  Etter siste gang i perioden kommer oppgaven tilbake når neste periode starter.
- **Forfalt når perioden slutter:** en timesjobb i databasen (pg_cron) flytter fristen til neste
  periode, så oppgaven ikke står forfalt hele vinteren. Utsetter man til en dato utenfor
  perioden, gjelder datoen.
- **Årshjulet** viser sesongoppgaver i periodens første måned.
- **Maler:** varmepumpefilteret gjelder nå okt–apr (allerede aktiverte oppgaver er uendret).
  Nye: «Klipp plenen» (1 uke etter sist, mai–sep) og «Luk ugress i bedene» (2 uker etter sist,
  mai–aug), begge krever hage.

## Hjemprofil (18. november 2026)

- **Om hjemmet:** noen spørsmål om boligen (boligtype, hage, bil, hytte, varmepumpe, peis,
  ventilasjon, vannbåren varme, brønn og avløp). Vises etter at husstanden er opprettet (kan
  hoppes over) og under Innstillinger → «Hjemmet». Bare voksne.
- **Forslag:** etter svarene vises en liste med oppgaver til årshjulet, alle valgt, som kan
  velges bort før «Legg til». Endres svarene senere, foreslås bare nye oppgaver. Ingenting slettes.
- **Innhold:** 23 nye maler og betingelser på eksisterende, fra `docs/hjemprofil-oppgaver-UTKAST.md`.
  Filtrene i varmepumpe og ventilasjon gjentas «8 uker / 6 måneder etter sist» og ligger i Oppgaver.
  Første frist er ett intervall frem. (Varmepumpefilteret har fått periode okt–apr og står i
  oktober i årshjulet, se Sesongoppgaver.)
- **Årshjulet:** aktive oppgaver blir værende selv om svarene endres.

## Kom i gang

```bash
npm install
npx expo start
```

Skann QR-koden med Expo Go på mobilen (Android: i Expo Go, iOS: med kameraet).

## Ekte bygg (EAS)

Konfigurasjonen ligger i `eas.json` (profilene `development`, `preview`, `production`).
Bundle identifier / package er `no.mittansvar.app` (bekreftes før første opplasting – kan ikke
endres etterpå). Byggnummer styres av EAS (`appVersionSource: remote`).

- `development`: egen utviklingsklient (`expo-dev-client`) i stedet for Expo Go.
- `preview`: internt testbygg (APK på Android).
- `production`: til App Store / Google Play, byggnummer økes automatisk.

`.env` lastes ikke opp til EAS. Supabase-nøklene legges inn som EAS-miljøvariabler, én gang:

```bash
npx eas-cli login
npx eas-cli init                      # legger inn owner og projectId i app.json
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value <url> \
  --environment development --environment preview --environment production --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_KEY --value <anon-nøkkel> \
  --environment development --environment preview --environment production --visibility plaintext
```

## Tester

```bash
npm test          # enhetstester (Jest), f.eks. planlegging av påminnelser
npm run db:test   # databasetester (pgTAP), krever at Supabase kjører lokalt (npm run db:start)
                  # pg_cron (timesjobbene for sesongoppgaver og anonyme brukere) følger med i Supabase CLI
```
