# Gjennomgang av malene: korte titler og «Slik gjør du»

Forslag til nye titler og forklaringer på alle 78 malene, i tråd med [VISJON.md](VISJON.md).
**Ingenting er endret i databasen.** Endringene gjøres i en egen migrasjon etter at du har gått
gjennom dette dokumentet.

Hentet fra den lokale databasen (78 maler, 76 aktive). I dag er 33 titler lengre enn 30 tegn.

## Slik er det tenkt

- **Tittel:** verb først, maks ca. 30 tegn (antall tegn står i parentes). Detaljene flyttes til
  «Slik gjør du».
- **Slik gjør du:** 1–3 korte, konkrete setninger. Det man gjør først, hvorfor etterpå. Vises bak
  (i)-ikonet og øverst på redigeringsskjermen. Maks 300 tegn (grensen i databasen).
- **Ikon:** årshjul, hjemprofil, intervall og sesong får (i). Rutinene får det ikke, men
  beskrivelsen vises fortsatt på redigeringsskjermen. Si fra hvis noen rutiner bør ha ikon.
- **Kilde:** ingen mal har kilde i dag (`source_name` og `source_url` er tomme). Alle står derfor
  som **mangler**. Ingen kilder er funnet på.

## Ting å være obs på

- **Like titler slås sammen** til én rad i forslagslistene (`groupSuggestions`, «Mars og september ·
  2 ganger i året»). Parene `gutters-spring`/`gutters-autumn` og `heat-pump-outdoor-unit-jan`/`-nov`
  har samme tittel i dag, og forslaget beholder det. Endres én, må den andre endres likt.
- **Nye titler på aktive oppgaver:** tittelen kopieres til oppgaven når malen legges til. Endrer vi bare
  malene, beholder husstander som allerede har oppgaven, den gamle tittelen og teksten. Vi må
  bestemme om migrasjonen også skal oppdatere oppgaver der tittel og beskrivelse fortsatt er lik malens.
- **Nytt innhold** er merket i Merknad. Der står det noe som ikke står i dagens tekst, og det bør sjekkes.
- **Rutinene** bruker infinitiv («Vaske badet»), årshjulet bruker imperativ («Vask vinduer ute»). Begge
  har verbet først. Forslaget er å la rutinene være som de er. Si fra hvis du vil ha samme form overalt.

## Mangler kilde

Alle 78. Når kildene er klare, legges de inn som `source_name` (f.eks. «DSB») og eventuelt
`source_url`.

## Årshjul (22)

Årlige maler for alle husstander, uten krav til hjemprofilen.

| Slug | Nå: tittel | Forslag: tittel | Nå: beskrivelse | Forslag: «Slik gjør du» | Kilde | Merknad |
|---|---|---|---|---|---|---|
| `fridge-deep-clean` | Vask kjøleskapet grundig (24) | Vask kjøleskapet grundig (uendret) (24) | Ta ut alt, kast det som er gått ut, og vask hyller og skuffer med lunkent vann og litt oppvaskmiddel. Tørk godt før maten settes inn igjen. | Ta ut alt og kast det som er gått ut. Vask hyller og skuffer med lunkent vann og litt oppvaskmiddel. Tørk godt før maten settes inn igjen. | **mangler** |  |
| `kitchen-leak-check` | Se etter lekkasje under kjøkkenbenk og ved oppvaskmaskin (56) | Se etter lekkasje under benken (30) | Se etter fukt, misfarging og svak lukt under vasken og rundt oppvaskmaskinen. Små lekkasjer oppdaget tidlig sparer store skader. | Se etter fukt, misfarging og svak lukt under vasken og rundt oppvaskmaskinen. Små lekkasjer som oppdages tidlig, sparer store skader. | **mangler** |  |
| `ventilation-valves` | Sjekk og rens ventilasjonsventiler (34) | Rens ventilasjonsventilene (26) | Støv i ventilene gir dårligere luft. Tørk av eller støvsug ventilene, og la innstillingen på dem være som den er. | Tørk av eller støvsug ventilene. Ikke vri på dem, så innstillingen blir som den er. | **mangler** |  |
| `earth-fault-breaker` | Trykk på testknappen på jordfeilbryteren (40) | Test jordfeilbryteren (21) | Trykk på testknappen i sikringsskapet. Bryteren skal slå ut, og strømmen forsvinner på kursene den beskytter. Slå den på igjen. Slår den ikke ut, kontakt en elektriker. | Trykk på testknappen i sikringsskapet. Bryteren skal slå ut, så slår du den på igjen. Slår den ikke ut, kontakt en elektriker. | **mangler** |  |
| `water-heater-valve` | Sjekk sikkerhetsventilen på varmtvannsberederen (47) | Sjekk ventilen på berederen (27) | Gjelder hvis dere har egen varmtvannsbereder. Vri eller løft på sikkerhetsventilen til det renner vann ut i sluket. Følg anvisningen for berederen. Lekker ventilen, eller slipper den ikke ut vann, kontakt en rørlegger. | Vri eller løft på sikkerhetsventilen til det renner vann ut i sluket. Følg anvisningen for berederen. Lekker ventilen, eller kommer det ikke vann, kontakt en rørlegger. | **mangler** | Gjelder bare egen bereder. Kandidat for hjemprofilen? |
| `windows-outside` | Vask vinduer ute (16) | Vask vinduer ute (uendret) (16) | Vask helst når det er overskyet. I sterk sol tørker vannet før du rekker å tørke av, og det blir striper. | Vask helst når det er overskyet. I sterk sol tørker vannet for fort, og det blir striper. | **mangler** |  |
| `kids-clothes-summer` | Gå gjennom barneklær før sommeren (33) | Sorter barneklær før sommeren (29) | Legg bort vinterklærne og se hva som er blitt for lite. Da vet dere hva som trengs til sommeren. | Legg bort vinterklærne og se hva som er blitt for lite. Da vet dere hva som trengs til sommeren. | **mangler** |  |
| `roof-check` | Sjekk taket etter vinteren (26) | Sjekk taket etter vinteren (uendret) (26) | Se etter løse eller knuste takstein og skader etter snø og is. Bruk gjerne kikkert fra bakken, og overlat arbeid på taket til fagfolk. | Se etter løse eller knuste takstein og skader etter snø og is. Bruk gjerne kikkert fra bakken. Arbeid på taket overlater du til fagfolk. | **mangler** |  |
| `foundation-check` | Se etter fukt og sprekker i grunnmuren (38) | Sjekk grunnmuren (16) | Fukt i grunnmuren kan gi råte og mugg. Om våren ser du hvor smeltevannet går. Se etter våte flekker, sprekker og vann som renner mot huset. | Se etter våte flekker, sprekker og smeltevann som renner mot huset. Fukt i grunnmuren kan gi råte og mugg. | **mangler** |  |
| `outdoor-tap-open` | Åpne utekranen og sjekk for frostskader (39) | Åpne utekranen (14) | Åpne stoppekranen inne hvis du har en, og så kranen ute. Se etter lekkasje både ute og inne. En frostsprengt kran kan lekke inn i veggen uten at det synes. | Åpne stoppekranen inne hvis dere har en, og så kranen ute. Se etter lekkasje både ute og inne. En frostsprengt kran kan lekke inn i veggen uten at det synes. | **mangler** |  |
| `gutters-spring` | Rens takrenner og nedløp (24) | Rens takrennene (15) | Fjern løv og rusk, så regnvannet renner bort fra huset. Bruk en stødig stige og ha noen i nærheten. | Fjern løv og rusk fra renner og nedløp, så regnvannet renner bort fra huset. Bruk en stødig stige og ha noen i nærheten. | **mangler** | Samme tittel som høstversjonen (slås sammen i forslagene). |
| `deck-wash-stain` | Vask og beis terrassen (22) | Vask og beis terrassen (uendret) (22) | Vask terrassen og la den tørke godt i noen dager før du beiser. Følg anvisningen på boksen. | Vask terrassen og la den tørke godt i noen dager før du beiser. Følg anvisningen på boksen. | **mangler** |  |
| `bathroom-silicone` | Sjekk silikonfuger på badet (27) | Sjekk fugene på badet (21) | Se etter sprekker, misfarging og fuger som har løsnet. Skadde fuger kan slippe vann inn bak flisene. | Se etter sprekker, misfarging og fuger som har løsnet. Skadde fuger kan slippe vann inn bak flisene. | **mangler** |  |
| `exterior-check` | Sjekk kledning og maling ute (28) | Sjekk kledning og maling (24) | Flassende maling og sprekker slipper inn fukt. Små skader er raskere å rette enn en hel vegg. | Se etter flassende maling og sprekker, de slipper inn fukt. Små skader er raskere å rette enn en hel vegg. | **mangler** |  |
| `school-start` | Gå gjennom skolesaker og barneklær før skolestart (49) | Gjør klar til skolestart (24) | Sjekk sekk, gymtøy, sko og regntøy, og skriv en liste over det som mangler. | Sjekk sekk, gymtøy, sko og regntøy. Skriv en liste over det som mangler. | **mangler** |  |
| `dust-heaters` | Støvsug panelovner og radiatorer før fyringssesongen (52) | Støvsug ovner og radiatorer (27) | Støv på ovnene kan lukte svidd og gi dårligere luft når varmen slås på. Støvsug og tørk av før det blir kaldt. | Støvsug og tørk av før det blir kaldt. Støv på ovnene kan lukte svidd og gi dårligere luft når varmen slås på. | **mangler** |  |
| `gutters-autumn` | Rens takrenner og nedløp (24) | Rens takrennene (15) | Når løvet har falt, fjern det fra takrenner og nedløp. Tette renner kan gi is og vannskader i vinter. | Når løvet har falt, fjern det fra renner og nedløp. Tette renner kan gi is og vannskader i vinter. Bruk en stødig stige og ha noen i nærheten. | **mangler** | Samme tittel som vårversjonen. Stige-setningen er hentet fra vårversjonen. |
| `outdoor-tap-close` | Steng og tøm utekranen før frosten (34) | Steng og tøm utekranen (22) | Har utekranen egen stoppekran inne, steng den og åpne kranen ute så vannet renner ut. Har du frostsikker utekran, holder det å koble fra hageslangen, ellers kan vannet bli stående og fryse. | Har utekranen egen stoppekran inne, steng den og åpne kranen ute så vannet renner ut. Frostsikker utekran: koble fra hageslangen, ellers kan vannet bli stående og fryse. | **mangler** |  |
| `garden-furniture` | Ta inn hagemøbler og puter (26) | Ta inn hagemøblene (18) | Ta inn puter og møbler som ikke tåler vinteren, eller dekk dem godt til. Da holder de lenger. | Ta inn puter og møbler som ikke tåler vinteren, eller dekk dem godt til. Da holder de lenger. | **mangler** |  |
| `fire-extinguisher` | Sjekk at trykkmåleren på brannslukkeren står på grønt (53) | Sjekk brannslukkeren (20) | Viseren skal stå på grønt. Står den utenfor, må apparatet kontrolleres eller byttes. Sjekk også at det henger lett tilgjengelig. | Viseren på trykkmåleren skal stå på grønt. Står den utenfor, må apparatet kontrolleres eller byttes. Sjekk også at det henger lett tilgjengelig. | **mangler** |  |
| `smoke-alarms` | Test røykvarslerne og bytt batteri (34) | Test røykvarslerne (18) | 1. desember er røykvarslerdagen. Trykk på testknappen på alle røykvarslerne, og bytt batteri der det trengs. | Trykk på testknappen på alle røykvarslerne, og bytt batteri der det trengs. 1. desember er røykvarslerdagen. | **mangler** |  |
| `kitchen-hood-filter` | Rens filteret i kjøkkenviften (29) | Rens filteret i kjøkkenviften (uendret) (29) | Fett i filteret gir dårligere avtrekk og kan ta fyr. Metallfiltre kan ofte vaskes i oppvaskmaskinen, kullfiltre må byttes. | Metallfiltre kan ofte vaskes i oppvaskmaskinen, kullfiltre må byttes. Fett i filteret gir dårligere avtrekk og kan ta fyr. | **mangler** |  |

## Hjemprofil (24)

Årlige maler som foreslås ut fra svarene om hjemmet (varmepumpe, bil, brønn, hytte osv.).

| Slug | Nå: tittel | Forslag: tittel | Nå: beskrivelse | Forslag: «Slik gjør du» | Kilde | Merknad |
|---|---|---|---|---|---|---|
| `heat-pump-outdoor-unit-jan` | Sjekk at utedelen på varmepumpen er fri for løv, snø og is (58) | Sjekk utedelen på varmepumpen (29) | Midt på vinteren kan snø og is ha bygd seg opp. Utedelen trenger luft rundt seg for å virke godt. Fjern snø og is forsiktig og uten skarpe redskaper. | Fjern snø og is rundt og oppå utedelen, forsiktig og uten skarpe redskaper. Den trenger luft rundt seg for å virke godt. | **mangler** | Samme tittel som novemberversjonen. |
| `ventilation-filter-spring` (deaktivert) | Bytt filter i ventilasjonsanlegget (34) | Bytt ventilasjonsfilter (23) | Gjelder boliger med balansert ventilasjon. Tette filtre gir dårligere luft og høyere strømforbruk. Sjekk anvisningen for anlegget ditt for riktig filter. | Gjelder balansert ventilasjon. Sjekk anvisningen for riktig filter. Tette filtre gir dårligere luft og høyere strømforbruk. | **mangler** | Deaktivert (erstattet av intervallmalen). |
| `sewage-emptying` | Sjekk når slamavskilleren skal tømmes (37) | Sjekk tømming av slamavskiller (30) | Tømming skjer ofte etter en fast ordning i kommunen. Finn ut når det er neste gang, og sørg for at tømmebilen kommer til. | Finn ut når slamavskilleren skal tømmes neste gang. Det skjer ofte etter en fast ordning i kommunen. Sørg for at tømmebilen kommer til. | **mangler** |  |
| `summer-tyres` | Bytt til sommerdekk (19) | Bytt til sommerdekk (uendret) (19) | Sjekk mønsteret og lufttrykket når dekkene byttes, og bytt dekk som er slitt eller skadet. | Sjekk mønsteret og lufttrykket når dekkene byttes. Bytt dekk som er slitt eller skadet. | **mangler** |  |
| `car-wash-spring` | Vask bilen grundig etter vinteren, også under (45) | Vask bilen etter vinteren (25) | Veisalt som blir sittende, kan gi rust. Vask også understellet og hjulbuene. | Vask også understellet og hjulbuene. Veisalt som blir sittende, kan gi rust. | **mangler** |  |
| `firewood-stack` | Skaff og stable ved til neste vinter (36) | Stable ved til neste vinter (27) | Ved som stables om våren, får sommeren på å tørke. Stable luftig og under tak. Våt ved gir mer sot og dårligere varme. | Stable luftig og under tak, så veden får sommeren på å tørke. Våt ved gir mer sot og dårligere varme. | **mangler** |  |
| `well-inspect` | Sjekk brønnlokket og at overflatevann ikke renner inn (53) | Sjekk brønnlokket (17) | Smeltevann om våren kan føre forurensning ned i brønnen. Se at lokket er helt og tett, og at vannet renner bort fra brønnen. | Se at lokket er helt og tett, og at smeltevannet renner bort fra brønnen. Ellers kan forurensning komme ned i vannet. | **mangler** |  |
| `cabin-open` | Åpne hytta etter vinteren og se etter skader (44) | Åpne hytta etter vinteren (25) | Se etter frost- og snøskader, lekkasjer og spor av mus. Sjekk også tak og takrenner. Hytta står ofte tom, så skader blir oppdaget sent. | Se etter frost- og snøskader, lekkasjer og spor av mus. Sjekk også tak og takrenner. Hytta står ofte tom, så skader blir oppdaget sent. | **mangler** |  |
| `garden-mower` | Klargjør hage og gressklipper (29) | Klargjør hagen og klipperen (27) | Rak plenen, rydd bed og sjekk gressklipperen. En sløv kniv river gresset i stedet for å klippe det. | Rak plenen, rydd bedene og sjekk gressklipperen. En sløv kniv river gresset i stedet for å klippe det. | **mangler** |  |
| `lawn-fertilize` | Gjødsle plenen (14) | Gjødsle plenen (uendret) (14) | En plen som får næring, tåler slitasje og tørke bedre. Følg anvisningen på gjødsla. | Følg anvisningen på gjødsla. En plen som får næring, tåler slitasje og tørke bedre. | **mangler** |  |
| `ventilation-summer-mode` | Sjekk sommer- og vinterinnstilling på aggregatet (48) | Sjekk sommerinnstillingen (25) | Mange aggregater har en sommerinnstilling (bypass) som slipper uteluften forbi varmegjenvinneren. Gjelder bare hvis aggregatet har det. Se anvisningen. | Mange aggregater har en sommerinnstilling (bypass) som slipper uteluften forbi varmegjenvinneren. Har aggregatet det, se anvisningen. | **mangler** |  |
| `well-water-test` | Ta vannprøve av brønnvannet (27) | Ta prøve av brønnvannet (23) | Med egen brønn har dere selv ansvar for vannkvaliteten. Et laboratorium kan analysere prøven og fortelle hva den bør testes for. | Med egen brønn har dere selv ansvar for vannkvaliteten. Et laboratorium kan analysere prøven og si hva den bør testes for. | **mangler** |  |
| `sewage-inspect` | Se etter lukt, vann på bakken eller alarm rundt avløpsanlegget (62) | Sjekk avløpsanlegget (20) | Lukt, vann som blir stående på bakken eller en alarm kan bety feil på anlegget. Feil som oppdages tidlig, er billigere å rette. Kontakt fagfolk ved tvil. | Se etter lukt, vann som blir stående på bakken, eller alarm. Feil som oppdages tidlig, er billigere å rette. Kontakt fagfolk ved tvil. | **mangler** |  |
| `chimney-check` | Få sjekket pipe og ildsted før fyringssesongen (46) | Sjekk pipe og ildsted (21) | Se etter sprekker og at dører og pakninger på ildstedet er hele. Feiing og tilsyn gjøres av feiervesenet i kommunen. Spør dem ved tvil. | Se etter sprekker, og at dører og pakninger på ildstedet er hele. Feiing og tilsyn gjøres av feiervesenet i kommunen. Spør dem ved tvil. | **mangler** |  |
| `ventilation-filter-autumn` (deaktivert) | Bytt filter i ventilasjonsanlegget (34) | Bytt ventilasjonsfilter (23) | Gjelder boliger med balansert ventilasjon. Tette filtre gir dårligere luft og høyere strømforbruk. Sjekk anvisningen for anlegget ditt for riktig filter. | Gjelder balansert ventilasjon. Sjekk anvisningen for riktig filter. Tette filtre gir dårligere luft og høyere strømforbruk. | **mangler** | Deaktivert (erstattet av intervallmalen). |
| `ventilation-unit-clean` | Rengjør ventilasjonsaggregatet etter anvisningen (48) | Rengjør ventilasjonsaggregatet (30) | Støv i vifter og varmegjenvinner gir dårligere luft. Hva du kan gjøre selv, og hvor ofte, avhenger av aggregatet. Følg anvisningen, og bruk fagfolk ved tvil. | Følg anvisningen: den sier hva du kan gjøre selv, og hvor ofte. Støv i vifter og varmegjenvinner gir dårligere luft. Bruk fagfolk ved tvil. | **mangler** |  |
| `hydronic-pressure` | Sjekk trykket i varmeanlegget før fyringssesongen (49) | Sjekk trykket i varmeanlegget (29) | For lavt trykk gir dårlig varme. Les av manometeret på anlegget. Riktig trykk står i anvisningen. Er trykket for lavt, følg anvisningen eller kontakt en rørlegger. | Les av manometeret på anlegget. Riktig trykk står i anvisningen. Er trykket for lavt, følg anvisningen eller kontakt en rørlegger. | **mangler** |  |
| `winter-tyres` | Bytt til vinterdekk (19) | Bytt til vinterdekk (uendret) (19) | Bytt før det blir glatt. Vinterdekk trenger mer mønster enn sommerdekk, så sjekk mønsteret når du bytter. | Bytt før det blir glatt. Vinterdekk trenger mer mønster enn sommerdekk, så sjekk mønsteret når du bytter. | **mangler** |  |
| `car-winter-ready` | Gjør bilen klar for vinteren (28) | Gjør bilen klar for vinteren (uendret) (28) | Fyll spylervæske som tåler frost, sjekk viskerbladene, og legg isskrape og kost i bilen. | Fyll spylervæske som tåler frost, sjekk viskerbladene, og legg isskrape og kost i bilen. | **mangler** |  |
| `hydronic-bleed` | Luft radiatorene (16) | Luft radiatorene (uendret) (16) | Gjelder radiatorer. Har dere bare gulvvarme, kan oppgaven hoppes over. Luft i radiatorene gir kalde partier og lyder. | Skru opp luftenippelen med en luftenøkkel og hold en klut under. Steng når det kommer vann i stedet for luft. Luft i radiatorene gir kalde partier og lyder. | **mangler** | NYTT INNHOLD: fremgangsmåten står ikke i dagens tekst. Bør sjekkes. «Bare gulvvarme» er fjernet: står i hjemprofilen? |
| `leaves-rake` | Rake løv fra plenen (19) | Rak løv fra plenen (18) | Løv som blir liggende gjennom vinteren, kan kvele gresset. | Rak løvet av plenen før snøen kommer. Løv som blir liggende gjennom vinteren, kan kvele gresset. | **mangler** |  |
| `mower-winter` | Sett gressklipperen bort for vinteren (37) | Sett bort gressklipperen (24) | Rengjør klipperen før den settes bort. Bensinklipper: følg anvisningen for vinterlagring. Batteriklipper: lagre batteriet frostfritt. | Rengjør klipperen før den settes bort. Bensinklipper: følg anvisningen for vinterlagring. Batteriklipper: lagre batteriet frostfritt. | **mangler** |  |
| `cabin-close` | Gjør hytta klar for vinteren (28) | Gjør hytta klar for vinteren (uendret) (28) | Rydd bort mat som kan trekke til seg mus. Har hytta innlagt vann og står uoppvarmet, steng og tøm vannet så rørene ikke fryser. | Rydd bort mat som kan trekke til seg mus. Står hytta uoppvarmet med innlagt vann, steng og tøm vannet så rørene ikke fryser. | **mangler** |  |
| `heat-pump-outdoor-unit-nov` | Sjekk at utedelen på varmepumpen er fri for løv, snø og is (58) | Sjekk utedelen på varmepumpen (29) | Utedelen trenger luft rundt seg for å virke godt. Fjern løv, snø og is rundt og oppå den, forsiktig og uten skarpe redskaper. | Fjern løv, snø og is rundt og oppå utedelen, forsiktig og uten skarpe redskaper. Den trenger luft rundt seg for å virke godt. | **mangler** | Samme tittel som januarversjonen. |

## Intervall og sesong (4)

«Etter sist utført»-maler, noen av dem bare i en periode av året (sesong). Alle kommer fra hjemprofilen.

| Slug | Nå: tittel | Forslag: tittel | Nå: beskrivelse | Forslag: «Slik gjør du» | Kilde | Merknad |
|---|---|---|---|---|---|---|
| `heat-pump-filter` | Rens filtrene i varmepumpen (27) | Rens filtrene i varmepumpen (uendret) (27) | Støv i filtrene gir dårligere varme og høyere strømforbruk. Her er det satt til hver 8. uke. Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig. | Støv i filtrene gir dårligere varme og høyere strømforbruk. Her er det satt til hver 8. uke. Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig. | **mangler** | Uendret tekst. Mangler selve fremgangsmåten (ta ut, støvsug/skyll, la tørke): vil du ha den med? |
| `ventilation-filter` | Bytt filter i ventilasjonsanlegget (34) | Bytt ventilasjonsfilter (23) | Tette filtre gir dårligere luft og høyere strømforbruk. Her er det satt til hver 6. måned. Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig. | Sjekk anvisningen for riktig filter. Her er det satt til hver 6. måned. Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig. | **mangler** | Tette filtre-setningen er tatt ut for å holde tre setninger. Kan settes inn igjen. |
| `lawn-mow` | Klipp plenen (12) | Klipp plenen (uendret) (12) | Klipp ofte, og ikke for kort. Da blir plenen tettere, og det blir mindre mose og ugress. | Klipp ofte, og ikke for kort. Da blir plenen tettere, og det blir mindre mose og ugress. | **mangler** |  |
| `weed-beds` | Luk ugress i bedene (19) | Luk ugress i bedene (uendret) (19) | Små ugress er lette å dra opp. Venter du, setter de frø og sprer seg. | Dra opp ugresset mens det er lite. Venter du, setter det frø og sprer seg. | **mangler** |  |

## Rutiner – ikke ikon (28)

«Forslag til hverdagen». Titlene er korte allerede, og forslaget er å la titler og tekster være.
Ingen ikon i listene, men beskrivelsen vises på redigeringsskjermen.

### Felles (8)

| Slug | Tittel | Beskrivelse | Ikon | Kilde |
|---|---|---|---|---|
| `routine-bathroom` | Vaske badet (11) | Toalett, servant, speil og gulv. Fast dag gjør det lettere å holde det ved like. | ikke ikon | **mangler** |
| `routine-bedding` | Skifte sengetøy (15) | Annenhver uke er vanlig. Vask på 60 grader hvis noen har allergi. | ikke ikon | **mangler** |
| `routine-floors` | Støvsuge og vaske gulv (22) | Støvsug først, og vask gulvene der det trengs, som kjøkken og gang. | ikke ikon | **mangler** |
| `routine-kitchen-deep` | Vaske komfyr og kjøkkenbenk grundig (35) | Ta platetopp, benk, fronter og håndtak. Fett er lettest å få bort før det setter seg. | ikke ikon | **mangler** |
| `routine-fridge-check` | Gå gjennom kjøleskapet (22) | Kast det som er gått ut, og bruk det som snart går ut. Gjør det før dere handler. | ikke ikon | **mangler** |
| `routine-laundry` | Vaske og brette klær (20) | Én fast klesvask i uka hindrer at kurven renner over. | ikke ikon | **mangler** |
| `routine-trash-recycling` | Ta ut søppel og pant (20) | Restavfall, papir og plast, og ta med panteflaskene neste gang du handler. | ikke ikon | **mangler** |
| `routine-plants` | Vanne planter (13) | Kjenn om jorda er tørr. De fleste planter tåler for lite vann bedre enn for mye. | ikke ikon | **mangler** |

### Voksne (2)

| Slug | Tittel | Beskrivelse | Ikon | Kilde |
|---|---|---|---|---|
| `routine-meal-plan` | Planlegge middagene for uka (27) | Bestem middagene, og skriv handlelisten samtidig. Det sparer både tid og penger. | ikke ikon | **mangler** |
| `routine-bills` | Gå gjennom regninger og nettbank (32) | Sjekk at regningene er betalt eller lagt inn, og se over faste trekk og abonnementer. | ikke ikon | **mangler** |

### Barn (18)

| Slug | Tittel | Beskrivelse | Ikon | Kilde |
|---|---|---|---|---|
| `routine-kid-toys` | Rydde lekene på plass (21) | Alle lekene tilbake i kassen eller hylla før kveldsmat. Små barn klarer mye når det er tydelig hvor ting skal. | ikke ikon | **mangler** |
| `routine-kid-laundry-basket` | Legge skitne klær i skittentøyskurven (37) | Klærne som er brukt, går rett i kurven når man kler av seg. Da slipper noen å plukke dem opp fra gulvet. | ikke ikon | **mangler** |
| `routine-kid-help-table` | Hjelpe til med å dekke bordet (29) | Legge frem bestikk og servietter til middag. En fin første jobb for de minste. | ikke ikon | **mangler** |
| `routine-kid-plants` | Vanne blomstene (15) | Kjenn med fingeren om jorda er tørr, og vann bare de som trenger det. | ikke ikon | **mangler** |
| `routine-kid-plate` | Rydde av egen tallerken etter middag (36) | Tallerken, glass og bestikk til benken eller rett i oppvaskmaskinen. | ikke ikon | **mangler** |
| `routine-kid-bed` | Re opp senga (12) | Dyne og pute på plass om morgenen. Det tar ett minutt og får rommet til å se ryddig ut. | ikke ikon | **mangler** |
| `routine-kid-set-table` | Dekke bordet til middag (23) | Tallerkener, glass og bestikk til alle, og det som trengs av drikke og tilbehør. | ikke ikon | **mangler** |
| `routine-kid-room` | Rydde rommet (12) | Klær i skapet eller kurven, ting på plass og fritt gulv, så det går an å støvsuge. | ikke ikon | **mangler** |
| `routine-kid-fold` | Brette klær og pare sokker (26) | Brett de rene klærne og legg dem i skapet. Finn sokkene som hører sammen, og par dem. | ikke ikon | **mangler** |
| `routine-kid-dishwasher` | Tømme oppvaskmaskinen (21) | Sett tallerkener, glass og bestikk på plass. Skarpe kniver kan en voksen ta. | ikke ikon | **mangler** |
| `routine-kid-trash` | Tømme søppel på kjøkken og bad (30) | Knyt igjen posene på kjøkkenet og badet, bær dem ut og sett i nye poser. | ikke ikon | **mangler** |
| `routine-kid-wash-clothes` | Vaske egne klær (15) | Sorter etter farge, sjekk vaskemerkene og heng opp eller tørk når maskinen er ferdig. | ikke ikon | **mangler** |
| `routine-kid-dinner` | Lage middag (11) | Velg en rett, sjekk at det som trengs finnes, og lag middag til familien. Rydd kjøkkenet etterpå. | ikke ikon | **mangler** |
| `routine-kid-vacuum-living` | Støvsuge stua (13) | Flytt løse ting fra gulvet først, og ta med hjørnene og under sofaen. | ikke ikon | **mangler** |
| `routine-kid-bathroom-sink` | Vaske servant og speil på badet (31) | Vask servanten og kranen, og tørk speilet med en klut uten striper. | ikke ikon | **mangler** |
| `routine-kid-lunchbox` | Smøre egen matpakke (19) | Smør skivene og legg dem i matboksen, gjerne med litt frukt eller grønt ved siden av. | ikke ikon | **mangler** |
| `routine-kid-school-bag` | Pakke sekken og gymtøyet (24) | Bøker, lekser og drikkeflaske i sekken kvelden før, og gymtøyet de dagene det trengs. Da blir morgenen roligere. | ikke ikon | **mangler** |
| `routine-kid-load-dishwasher` | Sette inn i oppvaskmaskinen (27) | Skyll av tallerkener og glass, og sett dem inn i oppvaskmaskinen. | ikke ikon | **mangler** |
