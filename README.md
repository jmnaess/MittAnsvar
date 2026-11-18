# MittAnsvar
A family responsibility and household task management app for parents and children.

## Nytt i «I dag» (18. november 2026)

- **Rette avkrysninger:** voksne kan trykke på en utført oppgave hele dagen og velge
  «Ikke gjort» eller «Endre hvem» som gjorde den. Barn kan fortsatt angre egne avkrysninger
  innen 10 minutter.
- **Utsett til:** voksne kan utsette en oppgave til en senere dato. Den forsvinner fra «I dag»
  og kommer tilbake på den nye datoen, med «Angre» rett etterpå.
- **Færre utførte synlige:** hvert kort viser de 2 sist utførte og fremdrift («3 av 7»).
  Resten ligger bak «4 til gjort i dag», som kan foldes ut. Ved midnatt er «I dag» tom igjen.

## Kom i gang

```bash
npm install
npx expo start
```

Skann QR-koden med Expo Go på mobilen (Android: i Expo Go, iOS: med kameraet).

## Tester

```bash
npm test          # enhetstester (Jest), f.eks. planlegging av påminnelser
npm run db:test   # databasetester (pgTAP), krever at Supabase kjører lokalt (npm run db:start)
```
