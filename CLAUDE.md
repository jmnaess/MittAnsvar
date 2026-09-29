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
- Barn UTEN enhet: felles husstandsvisning der man trykker på sin avatar og krysser av.
  Felles visning kan bare krysse av – ingen redigering. PIN for å gå ut.
- Abonnement tilhører husstanden, ikke brukeren. Én betaling = tilgang for alle.
- Pris: 14 dagers gratis prøvetid, deretter 39 kr/mnd eller 299 kr/år.
- Gjentakelse, to modi: fast kalender (hver søndag) og intervall fra sist utført
  (3 måneder etter sist rens).
- Fullføringer lagres som historikk (task_completions), aldri bare completed = true.
- Årshjulet skal få ferdige norske vedlikeholdsmaler. Datamodellen må støtte maler.
- Etter fullført oppgave vises en kort tilbakemelding: faktabasert
  ("Visste du at …") eller humoristisk ("Hvor mange hybelkaniner fant du?").
  Husstanden velger tone: fakta, humor eller begge.

## Ikke i MVP
Poeng, belønninger, streaks, ukepenger/Vipps, AI, chat, bilder,
kalenderintegrasjoner, widgets.

## Arbeidsmåte
- Analyse og plan før kode. Spør hvis noe er uklart.
- Små, tydelige komponenter og funksjoner.
- Norsk i brukergrensesnittet, engelsk i kode og databasenavn.
- Forklar kort hva du gjør og hvorfor – utvikleren lærer underveis.