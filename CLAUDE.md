# MittAnsvar

App for husstander som gjør det enkelt å huske, fordele og følge opp oppgaver i hjemmet.
Kombinerer daglige rutiner med et årshjul for vedlikehold.

Mål: kommersiell app som skal gi sideinntekt.
Utvikler har 5–10 timer i uka og bygger med AI → velg enkle løsninger fremfor fleksible.

## Formål
- Hjelpe brukerne å huske oppgaver.
- Gjøre dem bevisste på oppgaver de bør ta tak i (f.eks. vedlikehold de ikke visste om).
- Styrke familielivet ved at alle tar ansvar.

## Stack
React Native, Expo, TypeScript, Supabase (EU-region), RevenueCat (senere).
Utvikling på Ubuntu. Testing på fysisk mobil med Expo Go – ikke emulator.

## Produktbeslutninger
- Husstand, ikke "familie", i datamodellen. Typer: enslig, par, familie med barn.
  Type velges ved oppstart og styrer forslag til oppgaver.
- Roller: voksen og barn. Forslag differensieres etter rolle og alder.
  Husstanden bestemmer selv hvem som gjør hva.
- Voksne har konto. Barn har profil (fornavn + avatar), aldri e-post eller egen konto.
- Barn MED enhet: kobles til via QR-kode fra en voksens mobil.
- Barn UTEN enhet: familieskjerm, en egen enhet (typisk iPad) koblet med QR-kode, uten voksenkonto.
  Viser dagens oppgaver med ett kort per person. Kan bare krysse av og angre egne avkrysninger.
  Ingen redigering, godkjenning eller saldo. Ingen PIN: en voksen kobler fra, eller skjermen kobler
  fra seg selv under tannhjulet (må kobles til på nytt med en kode fra en voksen).
  Familieraden gir personvisning (I dag, Kommende, Gjort siste 3 dager), bare avkrysning i I dag.
- Abonnement tilhører husstanden, ikke brukeren. Én betaling = tilgang for alle.
- Pris: 14 dagers gratis prøvetid, deretter 39 kr/mnd eller 299 kr/år.
- Gjentakelse, to modi: fast kalender (hver søndag) og intervall fra sist utført
  (3 måneder etter sist rens).
- Fullføringer lagres som historikk (task_completions), aldri bare completed = true.
- Årshjulet skal få ferdige norske vedlikeholdsmaler. Datamodellen må støtte maler.
- Etter fullført oppgave vises en kort tilbakemelding: faktabasert
  ("Visste du at …") eller humoristisk ("Hvor mange hybelkaniner fant du?").
  Husstanden velger tone: fakta, humor eller begge.
- Lønn per oppgave: voksne kan sette et beløp i hele kroner. Bare barn får lønn.
  Beløpet lagres på utføringen. Voksne registrerer utbetalinger manuelt, maks saldoen.
- Ledige jobber: oppgaver uten dato (engangs eller gjentakende) som barna kan ta.
- Barnets egne oppgaver: barnet legger inn noe det har gjort eller vil gjøre. Uten lønn skjer det med
  en gang (oppgave i dag, eller registrert som gjort), maks 10 per dag. Med lønn blir det et forslag:
  en voksen godkjenner (beløpet kan endres) eller avslår. Kan slås av i Innstillinger. Ikke på familieskjermen.
- Profilbilder: en voksen kan legge inn bilde for alle i husstanden. Barnet velger selv figur
  eller bilde, men kan ikke laste opp eller slette. Privat bøtte, bare husstanden leser,
  signerte URL-er. Bildet slettes med personen, kontoen og husstanden (docs/DATABASE.md §6).

## Ikke i MVP
Poeng, streaks, Vipps eller annen betaling i appen, felles mål,
AI, chat, bilder på oppgaver, kalenderintegrasjoner, widgets.

## Arbeidsmåte
- Analyse og plan før kode. Spør hvis noe er uklart.
- Små, tydelige komponenter og funksjoner.
- Norsk i brukergrensesnittet, engelsk i kode og databasenavn.
- All ny UI skal bruke komponentene i src/ui og tokens i src/ui/theme.ts. Ingen hardkodede
  farger eller fontstørrelser i skjermfiler. Se docs/DESIGN.md.
- Forklar kort hva du gjør og hvorfor – utvikleren lærer underveis.
- Svar alltid på norsk bokmål.