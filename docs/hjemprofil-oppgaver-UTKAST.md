# Hjemprofil: forslag til vedlikeholdsoppgaver – FØRSTEUTKAST

> ⚠️ **SKAL KVALITETSSIKRES AV UTVIKLEREN FØR DET LEGGES INN.**
> Utkastet er laget av AI ut fra vanlig, allmenn kunnskap om vedlikehold. **Ingen kilder er sjekket**,
> og det er ikke lagt inn kilder. Hyppighet og måneder er forslag. Rader merket ⚠️ er jeg ekstra usikker på
> (ofte fordi det avhenger av produsent, kommune eller anlegg).
> Rett direkte i tabellene: endre, stryk rader, eller skriv `OK` i Status.

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
- **Måned(er)**: årshjulet støtter bare «én gang i året i måned X». «Flere ganger i året» blir én mal per måned
  (slik filterbytte i ventilasjonen allerede er laget: vår og høst).
- **Hyppighet**: det brukeren ser («2 ganger i året» osv.).
- **Begrunnelse**: min begrunnelse for at oppgaven er med. Grunnlag for beskrivelsesteksten, ikke en kilde.
- **Status**: `Ny`, `Endret` (eksisterende mal får betingelse) eller `Uendret`. Skriv `OK` / `Stryk` / rettelse.

---

## 1. Eksisterende maler som får betingelse

Disse vises i dag for alle (eller alle hus). Med hjemprofil bør de bare vises når de passer.

| Slug | Tittel | Betingelse (ny) | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------------|-----------|-----------|-------------|--------|
| summer-tyres | Bytt til sommerdekk | Bil: ja | apr | 1 gang i året | Uten bil er oppgaven støy. | Endret |
| winter-tyres | Bytt til vinterdekk | Bil: ja | okt | 1 gang i året | Som over. | Endret |
| ventilation-filter-spring | Bytt filter i ventilasjonsanlegget | Balansert ventilasjon: ja | mar | 2 ganger i året (sammen med høst) | Teksten sier allerede «gjelder boliger med balansert ventilasjon». | Endret |
| ventilation-filter-autumn | Bytt filter i ventilasjonsanlegget | Balansert ventilasjon: ja | sep | (se over) | Som over. | Endret |
| chimney-check | Få sjekket pipe og ildsted før fyringssesongen | Peis/vedovn: ja (i stedet for «hus») | sep | 1 gang i året | En leilighet kan ha peis, og et hus kan mangle ildsted. | Endret |
| garden-mower | Klargjør hage og gressklipper | Hage/plen: ja (i tillegg til hus) | mai | 1 gang i året | Ikke alle hus har plen. | Endret |

Ingen endring foreslått for de andre 19 malene.

---

## 2. Nye maler

### Varmepumpe luft-luft (`has_air_heat_pump`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| heat-pump-filter-* | Rens filtrene i varmepumpen | Varmepumpe: ja | jan, mar, sep, nov | 4 ganger i året | Støv i filtrene gir dårligere varme og høyere strømforbruk. ⚠️ Hvor ofte varierer mellom produsenter. Sjekk hva som er vanlig å anbefale. | Ny |
| heat-pump-outdoor-unit | Sjekk at utedelen på varmepumpen er fri for løv, snø og is | Varmepumpe: ja | nov | 1 gang i året | Utedelen trenger luft rundt seg for å virke. ⚠️ Bør det også være en i januar/februar? | Ny |
| heat-pump-service | Vurder service på varmepumpen | Varmepumpe: ja | aug | 1 gang i året | ⚠️ Fagservice skjer ofte sjeldnere enn hvert år. Årshjulet har bare «hvert år». Stryk, eller la den være en årlig påminnelse om å *vurdere* service. | Ny |

### Peis/vedovn (`has_fireplace`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| chimney-check | (eksisterende, se §1) | Peis/vedovn: ja | sep | 1 gang i året | – | Endret |
| firewood-stack | Skaff og stable ved til neste vinter | Peis/vedovn: ja | apr | 1 gang i året | Ved som er stablet om våren, får sommeren på å tørke. Våt ved gir mer sot og dårligere varme. | Ny |
| fireplace-glass-gasket | Rens glasset og sjekk pakningene på ovnen | Peis/vedovn: ja | ⚠️ | – | ⚠️ Overlapper med `chimney-check`, som allerede nevner pakninger. Foreslår å stryke. | Ny? |

### Balansert ventilasjon (`has_balanced_ventilation`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| ventilation-filter-spring/autumn | (eksisterende, se §1) | Balansert: ja | mar, sep | 2 ganger i året | – | Endret |
| ventilation-unit-clean | Rengjør ventilasjonsaggregatet etter anvisningen | Balansert: ja | sep | 1 gang i året | Støv i vifter og varmegjenvinner gir dårligere luft. ⚠️ Hvor ofte og hva man selv kan gjøre, avhenger av aggregatet. | Ny |
| ventilation-summer-mode | Sjekk sommer- og vinterinnstilling på aggregatet | Balansert: ja | mai | 1 gang i året | ⚠️ Ikke alle aggregater har dette (bypass/sommerdrift). Stryk hvis det blir for spesielt. | Ny |

### Vannbåren varme (`has_hydronic_heating`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| hydronic-pressure | Sjekk trykket i varmeanlegget før fyringssesongen | Vannbåren: ja | sep | 1 gang i året | For lavt trykk gir dårlig varme. Manometeret viser trykket. Riktig verdi står i anvisningen for anlegget. | Ny |
| hydronic-bleed | Luft radiatorene | Vannbåren: ja | okt | 1 gang i året | Luft i radiatorene gir kalde partier og lyder. ⚠️ Gjelder radiatorer, ikke gulvvarme. Skal teksten si det, eller trengs et eget spørsmål? | Ny |

### Egen brønn (`has_private_well`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| well-water-test | Ta vannprøve av brønnvannet | Brønn: ja | mai | 1 gang i året | Eier av egen brønn har selv ansvar for vannkvaliteten. ⚠️ Anbefalt hyppighet er ikke sjekket. Skal det stå «jevnlig» i teksten? | Ny |
| well-inspect | Sjekk brønnlokket og at overflatevann ikke renner inn | Brønn: ja | apr | 1 gang i året | Smeltevann om våren kan føre forurensning ned i brønnen. | Ny |
| well-filter | Bytt filter eller UV-lampe i vannrenseanlegget | Brønn: ja | ⚠️ | – | ⚠️ Ikke alle brønner har renseanlegg, og intervallet avhenger av anlegget. Foreslår å stryke eller ta det senere. | Ny? |

### Avløp (`sewage_type`)

«Kommunalt» gir ingen oppgaver.

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| sewage-emptying | Sjekk når slamavskilleren skal tømmes | Avløp: septiktank eller minirenseanlegg | mar | 1 gang i året | Tømming er ofte en kommunal ordning med fast intervall. Påminnelsen er å vite når, og at det er fri adkomst for bilen. ⚠️ Riktig formulering avhenger av kommune. Gjelder også minirenseanlegg (slam)? | Ny |
| sewage-inspect | Se etter lukt, vann på bakken eller alarm rundt avløpsanlegget | Avløp: septiktank eller minirenseanlegg | mai | 1 gang i året | Feil oppdaget tidlig er billigere å rette. | Ny |
| sewage-minirens | Sjekk kjemikalier og serviceavtale for minirenseanlegget | Avløp: minirenseanlegg | ⚠️ | – | ⚠️ Hvor ofte kjemikaliene fylles på, avhenger av anlegget. Service skjer ofte etter avtale med leverandør. Velg måned, eller stryk. | Ny |

### Hage/plen (`has_garden`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| garden-mower | (eksisterende, se §1) | Hage: ja | mai | 1 gang i året | – | Endret |
| lawn-fertilize | Gjødsle plenen | Hage: ja | mai | 1 gang i året | En plen som får næring, tåler slitasje og tørke bedre. ⚠️ Mange gjødsler to ganger. Legg til august? | Ny |
| leaves-rake | Rake løv fra plenen | Hage: ja | okt | 1 gang i året | Løv som blir liggende gjennom vinteren, kan kvele gresset. | Ny |
| mower-winter | Sett gressklipperen bort for vinteren | Hage: ja | okt | 1 gang i året | Rengjør klipperen. Bensin: følg anvisningen for vinterlagring. Batteri: lagres frostfritt. | Ny |

### Bil (`has_car`)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| summer-tyres / winter-tyres | (eksisterende, se §1) | Bil: ja | apr, okt | – | – | Endret |
| car-winter-ready | Gjør bilen klar for vinteren | Bil: ja | okt | 1 gang i året | Spylervæske som tåler frost, viskerblader og isskrape. | Ny |
| car-wash-spring | Vask bilen grundig etter vinteren, også under | Bil: ja | apr | 1 gang i året | Veisalt som blir sittende, kan gi rust. | Ny |

### Enebolig / rekkehus (eksisterende `housing_types`, ingen ny betingelse)

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| foundation-check | Se etter fukt og sprekker i grunnmuren | Enebolig | apr | 1 gang i året | Fukt i grunnmuren kan gi råte og mugg. Våren viser hvor vannet går. | Ny |
| exterior-check | Sjekk kledning og maling ute | Enebolig, rekkehus | jun | 1 gang i året | Flassende maling slipper inn fukt. Små flekker er raskere å ta enn hele veggen. | Ny |

### Hytte (`has_cabin`)

Hytte er et eget ja/nei-spørsmål, ikke en boligtype. Hytteoppgavene kommer i tillegg til oppgavene for hovedboligen.

| Slug | Tittel | Betingelse | Måned(er) | Hyppighet | Begrunnelse | Status |
|------|--------|-----------|-----------|-----------|-------------|--------|
| cabin-close | Gjør hytta klar for vinteren | Hytte: ja | okt | 1 gang i året | Hindrer frostskader og mus. ⚠️ Steng og tøm vannet bare hvis hytta har innlagt vann og ikke er oppvarmet. | Ny |
| cabin-open | Åpne hytta etter vinteren og se etter skader | Hytte: ja | apr | 1 gang i året | Se etter frost- og snøskader, lekkasjer og spor av mus. | Ny |
| cabin-gutters-roof | Sjekk tak og takrenner på hytta | Hytte: ja | ⚠️ mai eller sep | 1 gang i året | Hytta står ofte tom, så skader blir oppdaget sent. ⚠️ Egen hytteoppgave, eller stryk? | Ny |

> ⚠️ Svarene om peis, brønn og avløp gjelder hovedboligen. Har hytta peis eller brønn, får dere ikke
> egne hytteoppgaver for det. Godt nok for MVP?

---

## 3. Bevisst utelatt

- **EU-kontroll på bilen**: annethvert år, og datoen avhenger av bilen. Passer ikke i årshjulet.
- **Feiing**: gjøres av kommunen. Dekket av `chimney-check`.
- **Pipebeslag, takstein, drenering ved fagfolk**: for spesielt og for dyrt å foreslå generelt.
