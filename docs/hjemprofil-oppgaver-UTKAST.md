# Hjemprofil: forslag til vedlikeholdsoppgaver – UTKAST 2

> ⚠️ **SKAL KVALITETSSIKRES AV UTVIKLEREN FØR DET LEGGES INN.**
> Utkastet er laget av AI ut fra vanlig, allmenn kunnskap om vedlikehold. **Ingen kilder er sjekket**,
> og det er ikke lagt inn kilder. Hyppighet og måneder er forslag. Rader merket ⚠️ er jeg ekstra usikker på
> (ofte fordi det avhenger av produsent, kommune eller anlegg).
> Rett direkte i tabellene: endre, stryk rader, eller skriv `OK` i Status.
>
> **Utkast 2 (2026-11-18):** rettet etter gjennomgang. Rader merket `OK` er godkjent.
> Rader merket `Ny i utkast 2` eller `Endret i utkast 2` trenger fortsatt ditt blikk.

## Spørsmålene (vedtatt 2026-11-18)

| Spørsmål | Svar | Kolonne |
|----------|------|---------|
| Boligtype | Enebolig / Rekkehus-tomannsbolig / Leilighet | `housing_type` (finnes fra før) |
| Hage/plen | ja/nei | `has_garden` |
| Bil | ja/nei | `has_car` |
| Hytte | ja/nei | `has_cabin` |
| Varmepumpe luft-luft | ja/nei | `has_air_heat_pump` |
| Peis/vedovn | ja/nei | `has_fireplace` |
| Balansert ventilasjon | ja/nei | `has_balanced_ventilation` |
| Vannbåren varme | ja/nei | `has_hydronic_heating` |
| Egen brønn | ja/nei | `has_private_well` |
| Avløp | Kommunalt / Septiktank / Minirenseanlegg | `sewage_type` |

## Slik leser du tabellene

- **Betingelse**: hvilke svar i hjemprofilen som må til. «Alle» = ingen betingelse.
  Boligtype bruker den eksisterende `housing_types` på malen. Ubesvart spørsmål = betingelsen er ikke oppfylt.
- **Måned(er)**: en **årsoppgave** ligger i årshjulet, én gang i året i måned X. «Flere ganger i året» blir
  én mal per måned.
- **Intervall**: en **intervalloppgave** gjentas en fast tid etter at den sist ble gjort («hver 8. uke etter sist
  utført»). Den har ingen måned og ligger ikke i årshjulet, men i Oppgaver. Brukeren kan endre hyppigheten.
  Brukes der hyppigheten avhenger av produsent eller anlegg. ⚠️ Krever en liten endring i appen, se §4.
- **Hyppighet**: det brukeren ser.
- **Begrunnelse**: min begrunnelse for at oppgaven er med. Grunnlag for beskrivelsesteksten, ikke en kilde.
- **Status**: `Ny`, `Endret` (eksisterende mal får betingelse) eller `Uendret`. Skriv `OK` / `Stryk` / rettelse.

> 📌 **Senere, når sesongoppgaver finnes:** filteroppgavene (varmepumpe og ventilasjon) skal begrenses til
> fyringssesongen. I dag gjentas de hele året.

---

## 1. Eksisterende maler som får betingelse

Disse vises i dag for alle (eller alle hus). Med hjemprofil bør de bare vises når de passer.

| Slug | Tittel | Betingelse (ny) | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------------|-----------|-----------|-------------|--------|
| summer-tyres | Bytt til sommerdekk | Bil: ja | apr | 1 gang i året | Uten bil er oppgaven støy. | OK |
| winter-tyres | Bytt til vinterdekk | Bil: ja | okt | 1 gang i året | Som over. | OK |
| ventilation-filter-spring | Bytt filter i ventilasjonsanlegget | Balansert ventilasjon: ja | mar | – | **Erstattes av `ventilation-filter`** (intervall, se §2). Malen deaktiveres (`is_active = false`). Husstander som har den aktivert, beholder oppgaven. | Endret i utkast 2 |
| ventilation-filter-autumn | Bytt filter i ventilasjonsanlegget | Balansert ventilasjon: ja | sep | – | Som over: erstattes og deaktiveres. | Endret i utkast 2 |
| chimney-check | Få sjekket pipe og ildsted før fyringssesongen | Peis/vedovn: ja (i stedet for «hus») | sep | 1 gang i året | En leilighet kan ha peis, og et hus kan mangle ildsted. | OK |
| garden-mower | Klargjør hage og gressklipper | Hage/plen: ja (i tillegg til hus) | mai | 1 gang i året | Ikke alle hus har plen. | OK |

### Eksisterende maler du spurte om (finnes allerede, ingen endring)

| Slug | Tittel | Betingelse | Måned | Status |
|------|--------|-----------|-------|--------|
| earth-fault-breaker | Trykk på testknappen på jordfeilbryteren | Alle | mar | Finnes |
| gutters-autumn | Rens takrenner og nedløp | Hus (rekkehus, enebolig) | okt | Finnes |
| outdoor-tap-close | Steng og tøm utekranen før frosten | Hus (rekkehus, enebolig) | okt | Finnes |
| Sikkerhetsventil på varmtvannsbereder | – | – | – | **Mangler.** Lagt til i §2 under «Alle boliger». |

Ingen endring foreslått for de andre malene.

---

## 2. Nye maler

### Alle boliger

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| water-heater-valve | Sjekk sikkerhetsventilen på varmtvannsberederen | Alle | mar | 1 gang i året | Ventilen slipper ut vann hvis trykket i berederen blir for høyt. Den kan sette seg fast hvis den aldri brukes. Teksten starter med «Gjelder hvis dere har egen varmtvannsbereder.» Deretter: vri eller løft på ventilen til det renner vann ut i sluket. Følg anvisningen for berederen, og kontakt rørlegger hvis den lekker eller ikke slipper ut vann. ⚠️ Fremgangsmåten er ikke sjekket mot en kilde. | OK |

### Varmepumpe luft-luft (`has_air_heat_pump`)

| Slug | Tittel | Betingelse | Når | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----|-----------|-------------|--------|
| heat-pump-filter | Rens filtrene i varmepumpen | Varmepumpe: ja | **Intervall** | Hver 8. uke etter sist utført | Støv i filtrene gir dårligere varme og høyere strømforbruk. Teksten: anbefalt hyppighet + «Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig.» | Endret i utkast 2 |
| heat-pump-outdoor-unit-nov | Sjekk at utedelen på varmepumpen er fri for løv, snø og is | Varmepumpe: ja | nov | 2 ganger i året (sammen med jan) | Utedelen trenger luft rundt seg for å virke. | Endret i utkast 2 |
| heat-pump-outdoor-unit-jan | Sjekk at utedelen på varmepumpen er fri for løv, snø og is | Varmepumpe: ja | jan | (se over) | Midt på vinteren kan snø og is ha bygd seg opp. | Ny i utkast 2 |
| ~~heat-pump-service~~ | ~~Vurder service på varmepumpen~~ | | | | | Strøket |

### Peis/vedovn (`has_fireplace`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| chimney-check | (eksisterende, se §1) | Peis/vedovn: ja | sep | 1 gang i året | – | OK |
| firewood-stack | Skaff og stable ved til neste vinter | Peis/vedovn: ja | apr | 1 gang i året | Ved som er stablet om våren, får sommeren på å tørke. Våt ved gir mer sot og dårligere varme. | OK |
| ~~fireplace-glass-gasket~~ | ~~Rens glasset og sjekk pakningene på ovnen~~ | | | | | Strøket |

### Balansert ventilasjon (`has_balanced_ventilation`)

| Slug | Tittel | Betingelse | Når | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----|-----------|-------------|--------|
| ventilation-filter | Bytt filter i ventilasjonsanlegget | Balansert: ja | **Intervall** | Hver 6. måned etter sist utført | Erstatter vår- og høstmalen (§1). Tette filtre gir dårligere luft og høyere strømforbruk. Teksten: anbefalt hyppighet + «Sjekk hva produsenten anbefaler, og endre hyppigheten om nødvendig.» | OK |
| ventilation-unit-clean | Rengjør ventilasjonsaggregatet etter anvisningen | Balansert: ja | sep | 1 gang i året | Støv i vifter og varmegjenvinner gir dårligere luft. Jeg foreslår at den blir en **årsoppgave** i september, ikke intervall. Den hører naturlig hjemme før fyringssesongen, og måneden kan endres. Teksten sier at hyppigheten avhenger av aggregatet. ⚠️ Si fra hvis du heller vil ha intervall. | OK (vurdert: årsoppgave) |
| ventilation-summer-mode | Sjekk sommer- og vinterinnstilling på aggregatet | Balansert: ja | mai | 1 gang i året | Ikke alle aggregater har dette (bypass/sommerdrift). | OK |

### Vannbåren varme (`has_hydronic_heating`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| hydronic-pressure | Sjekk trykket i varmeanlegget før fyringssesongen | Vannbåren: ja | sep | 1 gang i året | For lavt trykk gir dårlig varme. Manometeret viser trykket. Riktig verdi står i anvisningen for anlegget. | OK |
| hydronic-bleed | Luft radiatorene | Vannbåren: ja | okt | 1 gang i året | Luft i radiatorene gir kalde partier og lyder. Teksten: gjelder radiatorer, og kan hoppes over ved gulvvarme. | OK |

### Egen brønn (`has_private_well`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| well-water-test | Ta vannprøve av brønnvannet | Brønn: ja | mai | 1 gang i året | Eier av egen brønn har selv ansvar for vannkvaliteten. | OK |
| well-inspect | Sjekk brønnlokket og at overflatevann ikke renner inn | Brønn: ja | apr | 1 gang i året | Smeltevann om våren kan føre forurensning ned i brønnen. | OK |
| ~~well-filter~~ | ~~Bytt filter eller UV-lampe i vannrenseanlegget~~ | | | | | Strøket |

### Avløp (`sewage_type`)

«Kommunalt» gir ingen oppgaver.

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| sewage-emptying | Sjekk når slamavskilleren skal tømmes | Avløp: septiktank eller minirenseanlegg | mar | 1 gang i året | Tømming er ofte en kommunal ordning med fast intervall. Påminnelsen er å vite når, og at det er fri adkomst for bilen. | OK |
| sewage-inspect | Se etter lukt, vann på bakken eller alarm rundt avløpsanlegget | Avløp: septiktank eller minirenseanlegg | mai | 1 gang i året | Feil oppdaget tidlig er billigere å rette. | OK |
| ~~sewage-minirens~~ | ~~Sjekk kjemikalier og serviceavtale for minirenseanlegget~~ | | | | | Strøket |

### Hage/plen (`has_garden`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| garden-mower | (eksisterende, se §1) | Hage: ja | mai | 1 gang i året | – | OK |
| lawn-fertilize | Gjødsle plenen | Hage: ja | mai | 1 gang i året | En plen som får næring, tåler slitasje og tørke bedre. | OK |
| leaves-rake | Rake løv fra plenen | Hage: ja | okt | 1 gang i året | Løv som blir liggende gjennom vinteren, kan kvele gresset. | OK |
| mower-winter | Sett gressklipperen bort for vinteren | Hage: ja | okt | 1 gang i året | Rengjør klipperen. Bensin: følg anvisningen for vinterlagring. Batteri: lagres frostfritt. | OK |

### Bil (`has_car`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| summer-tyres / winter-tyres | (eksisterende, se §1) | Bil: ja | apr, okt | – | – | OK |
| car-winter-ready | Gjør bilen klar for vinteren | Bil: ja | okt | 1 gang i året | Spylervæske som tåler frost, viskerblader og isskrape. | OK |
| car-wash-spring | Vask bilen grundig etter vinteren, også under | Bil: ja | apr | 1 gang i året | Veisalt som blir sittende, kan gi rust. | OK |

### Enebolig / rekkehus (eksisterende `housing_types`, ingen ny betingelse)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| foundation-check | Se etter fukt og sprekker i grunnmuren | Enebolig, rekkehus | apr | 1 gang i året | Fukt i grunnmuren kan gi råte og mugg. Våren viser hvor vannet går. | Endret i utkast 2 (rekkehus lagt til) |
| exterior-check | Sjekk kledning og maling ute | Enebolig, rekkehus | jun | 1 gang i året | Flassende maling slipper inn fukt. Små flekker er raskere å ta enn hele veggen. | OK |

### Hytte (`has_cabin`)

Hytte er et eget ja/nei-spørsmål, ikke en boligtype. Hytteoppgavene kommer i tillegg til oppgavene for hovedboligen.

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| cabin-close | Gjør hytta klar for vinteren | Hytte: ja | okt | 1 gang i året | Hindrer frostskader og mus. Steng og tøm vannet bare hvis hytta har innlagt vann og ikke er oppvarmet. | OK |
| cabin-open | Åpne hytta etter vinteren og se etter skader | Hytte: ja | apr | 1 gang i året | Se etter frost- og snøskader, lekkasjer og spor av mus. Teksten tar også med **tak og takrenner** (fra den strøkne `cabin-gutters-roof`). | Endret i utkast 2 |
| ~~cabin-gutters-roof~~ | ~~Sjekk tak og takrenner på hytta~~ | | | | | Strøket (slått sammen med cabin-open) |

> Svarene om peis, brønn og avløp gjelder hovedboligen. Har hytta peis eller brønn, får dere ikke
> egne hytteoppgaver for det. Godtatt for MVP.

---

## 3. Bevisst utelatt

- **EU-kontroll på bilen**: annethvert år, og datoen avhenger av bilen. Passer ikke i årshjulet.
- **Feiing**: gjøres av kommunen. Dekket av `chimney-check`.
- **Pipebeslag, takstein, drenering ved fagfolk**: for spesielt og for dyrt å foreslå generelt.
- **Service på varmepumpen, filter i vannrenseanlegg, kjemikalier i minirenseanlegg, glass og pakninger på
  ovnen**: strøket i utkast 2.

---

## 4. Intervallmaler: hva støttes i dag, og hva koster det?

**Databasen støtter det allerede.**
- `task_templates` har samme gjentakelseskolonner og regel som `tasks`, også `interval`.
- `activate_templates` kopierer gjentakelsen uendret.
- `compute_next_due` regner «N uker/måneder etter sist utført».

**Appen støtter det ikke.** `suggestForHousehold` tar bare med årsoppgaver med måned, fordi malene til nå bare har
vært årshjulet. En intervallmal ville aldri blitt foreslått.

**Det som må til.** Ingen ny migrering for skjemaet, bare TypeScript og tester:
1. Hjemprofilforslagene tar også med intervallmaler. Årshjulet viser fortsatt bare årsoppgaver.
   Intervalloppgavene havner i Oppgaver, som andre intervalloppgaver.
2. Forslagslisten viser «Hver 8. uke etter sist utført» i stedet for måned.
3. Jest-tester for begge, og en pgTAP-test for at en intervallmal aktiveres med riktig gjentakelse.

**Første frist (vedtatt):** en intervalloppgave som lages fra en mal (`activate_templates`), får første frist
**ett intervall frem** (filteret: om 8 uker). Den dukker altså ikke opp i «I dag» med en gang.
Egne intervalloppgaver er uendret: første frist er datoen brukeren velger. Krever en liten endring i
`activate_templates`, med pgTAP-test for begge.

**Anslag:** liten jobb, omtrent like stor som steg 2. Ingen ny UI, ingen endring i årshjulet.
