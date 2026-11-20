# Designsystem: «Varm og leken» (A4)

Ett visuelt uttrykk for hele appen: varme, lyse flater, en rolig petrol som hovedfarge, en
egen farge per person og tegnede dyreavatarer. Finnes i lyst og mørkt tema med samme uttrykk:
i mørkt er bakgrunnen varm mørkebrun (ikke kald grå/svart) og teksten lyse pasteller.

Alt ligger i `src/ui/`. Tokenene er i `src/ui/theme.ts`, og komponentene importeres fra
`src/ui` (`import { Card, Text } from '../src/ui'`).

Tekst og nye funksjoner følger [VISJON.md](VISJON.md): «Alle tar sin del.» Bruk ordene i
[ordlisten](#ordliste).

## Regler

- All ny UI bruker komponentene i `src/ui` og tokenene i `theme.ts`. Ingen hardkodede farger,
  fontstørrelser eller `fontWeight` i skjermfiler. Tegningene i `avatarArt.tsx` er unntaket.
- Farger hentes **alltid** fra temaet som vises, aldri direkte fra `theme.ts`:
  - i komponenten: `const { colors, shadow, personColor, sharedColors, scheme } = useTheme();`
  - stiler med farger: `const useStyles = makeStyles(({ colors }) => StyleSheet.create({ … }));`
    og `const styles = useStyles();` i komponenten. Stiler uten farger kan være vanlig
    `StyleSheet.create`.
- Ny farge: legg den i **både** `lightColors` og `darkColors` (TypeScript krever det).
- All tekst har minst **4.5:1** kontrast mot bakgrunnen, i begge temaer. Testen
  `src/ui/__tests__/ui.test.ts` sjekker alle tekstpar for lyst og mørkt. Legger du til en farge,
  legg paret til i testen. Ikke-tekst må ha minst **3:1** i begge temaer: tom sjekkboks mot
  surface/surfaceMuted, personens ring mot tint, surface og surfaceMuted, og haken på ringen.
- Trykkflater er minst **44 × 44**.
- **Forfalt** vises som merkelapp (`Chip tone="overdue"`) til høyre på raden, **aldri med dato**.
- Utført rad: tittelen gjennomstreket i `textMuted`, sjekkboksen fylt med personens ring-farge.
  I «I dag» står dagens utførte nederst i kortet, med «Gjort av …» når en annen enn den ansvarlige
  gjorde det. Trykk angrer innen 10 minutter. Har kortet ingenting igjen: «Alt er gjort i dag!».
- Personfarger styres av avatarnøkkelen (`personColor(member.avatar)` fra `useTheme()`), aldri av
  navn eller rolle.
- QR-koden er alltid mørk på lys (`qrInk`/`qrBg`) med lys kant, også i mørkt tema: mange skannere
  leser ikke invertert QR.

## Ordliste

Samme ting heter det samme overalt: i skjermer, tomtilstander, feilmeldinger og
tilgjengelighetstekster. Se [VISJON.md](VISJON.md) for tonen.

| Ord | Betyr | Ikke |
|---|---|---|
| Husstand | Alle som bor sammen og deler appen | «familie» i appen (familier er målgruppen, men ikke ordet i modellen) |
| Voksen / barn | Rollene. Voksne har konto, barn har profil | «forelder», «bruker» |
| Oppgave | Noe som er noens faste ansvar (eller felles), med eller uten lønn | «gjøremål», «jobb» |
| Ekstrajobb / Ekstrajobber | Noe utenom det faste som barna kan ta, gjerne med lønn. Ingen dato | «ledig jobb», «jobb» alene |
| Hverdag | Segmentet i «Oppgaver» med de faste, korte oppgavene og ekstrajobbene | |
| Årshjul | Det som skjer noen ganger i året: vedlikehold, sesong, lange intervaller | «vedlikeholdsplan» |
| I dag | Fanen med det som skal gjøres i dag | |
| Denne måneden | Månedsoppgaver fra årshjulet som kan gjøres når som helst i måneden | |
| Kommende | Det som kommer de neste ukene | |
| Felles | Hvem som helst i husstanden kan gjøre den | «alle» |
| Alle barna | En ekstrajobb alle barna kan ta | |
| Lønn | Beløpet i hele kroner på en oppgave eller ekstrajobb. Bare barn får lønn | «belønning», «poeng» |
| Opptjent / saldo | Det et barn har tjent minus utbetalinger | |
| Utbetaling | Når en voksen registrerer at pengene er gitt | |
| Til godkjenning | Barnets avkrysninger med lønn som venter på en voksen | |
| Figur / profilbilde | Den tegnede avataren / et eget bilde | |
| Familieskjerm | En felles enhet (typisk iPad) som viser dagens oppgaver | «kiosk» |
| Beredskapslager | Det husstanden trenger for å klare seg selv i en uke, basert på råd fra DSB. Varene er «på plass» eller «trenger vi ikke» | «nødlager», «DSBs liste» |
| Ta sin del / ansvar | Det appen handler om | «prestasjon», «belønning» |

## Lyst og mørkt tema

- Standard: appen følger telefonen. Under Innstillinger → **Utseende** kan man velge
  System / Lys / Mørk. Valget lagres på enheten (`secureStorage`, nøkkel `appearance`), ikke i
  databasen, og finnes også på barnets enhet.
- `ThemeProvider` (`src/ui/ThemeProvider.tsx`) ligger ytterst i `app/_layout.tsx`. Den viser
  ingenting før valget er lest, så appen ikke blinker fra lys til mørk.
- `Appearance.setColorScheme` gjør at det native følger valget: tastatur, `Alert` og
  Android-datovelgeren. iOS-datovelgerne får `themeVariant`, `TextField` får `keyboardAppearance`.
- Statuslinjen (`expo-status-bar`), navigasjonstemaet (`navigationTheme`), headerne og
  fanelinjen (`tabOptions.tsx`) følger temaet. `app.json` har `userInterfaceStyle: "automatic"`.

## Tokens

### Farger

| Token | Lys | Mørk | Bruk |
|---|---|---|---|
| background | `#FFFDF7` | `#1C1712` | sidebakgrunn |
| surface | `#FFFFFF` | `#28211A` | kort, rader på farget bakgrunn |
| surfaceMuted | `#FAF6EF` | `#322A21` | rader inne i kort |
| border / borderStrong | `#F1EBE1` / `#E4DCCF` | `#3A3128` / `#4D4236` | skiller, kant på sekundærknapp |
| checkboxBorder | `#A08A6C` | `#857563` | tom sjekkboks |
| text / textMuted / textWarm | `#2B2118` / `#6B5E52` / `#5C4A2A` | `#F5EDE1` / `#BFB1A0` / `#E8D3AC` | tekst |
| primary / primaryPressed / onPrimary | `#0E6E6E` / `#0A5252` / `#FFFFFF` | `#5CBDB6` / `#4AA59F` / `#14201F` | knapper, valgt fane |
| sun / sunSoft | `#F2B705` / `#FFF4D1` | `#F2B705` / `#3A2F14` | godkjenningsbanner, framheving |
| moneyBg / moneyText | `#FFF1C2` / `#6E4D00` | `#3D3112` / `#F4C95D` | lønn |
| overdueBg / overdueText | `#FDE4E1` / `#A3271A` | `#43201A` / `#FFA294` | forfalt |
| jobBg / jobAmount / jobSub | `#E3F3F1` / `#0E4F4F` / `#33504D` | `#173230` / `#93DCD5` / `#B8D4CF` | ekstrajobber |
| segmentBg / segmentSelected | `#F2ECE2` / `#FFFFFF` | `#231D17` / `#3A3128` | segmentert kontroll og valgt segment |
| iconTint | `#E3F3F1` | `#173230` | flaten bak kategoriikoner i «Oppgaver» |
| danger | `#A3271A` | `#FF9585` | feilmeldinger, «Slett»-knapper |
| backdrop | `rgba(43,33,24,0.4)` | `rgba(0,0,0,0.6)` | bak modaler |
| toastBg / toastText / toastMuted / toastAction | `#2B2118` / `#FFFFFF` / `#D9CFC4` / `#F2B705` | `#463B30` / `#FFF8EE` / `#D6C9B8` / `#F7C843` | banneret med «Angre» (i mørkt lysere enn flaten) |
| onRing | `#FFFFFF` | `#14201F` | haken i avkrysset sjekkboks |
| qrInk / qrBg | `#2B2118` / `#FFFFFF` | samme | QR-koden, alltid mørk på lys |
| cameraBg | `#000000` | `#000000` | bak kameraet |
| switchThumb | `#FFFFFF` | `#FFFFFF` | tommelen på `Switch`, lys i begge tema (som iOS) |

I mørkt tema blir hovedknappene lys petrol med mørk tekst: mørk petrol har bare ~3:1 mot mørk
bakgrunn, og ett primary-token brukes både som fyll og som tekst.

Skygge (`shadow`): lys 0 2 10 `rgba(43,33,24,0.07)`, mørk samme med `#000000` og 0.35.
`elevation: 2` på Android. I mørkt gjør flatenes lyshet mesteparten av jobben.

### Farge per person

`tint` = seksjonsbakgrunn, `ink` = overskrift på tint, `ring` = ring rundt avatar og avkrysset sjekkboks.
Ringen følger figuren i tegningen (derfor er ugla brun på lilla tint).

Lyst tema (`lightPersonColors`):

| Avatar | tint | ink | ring |
|---|---|---|---|
| bear | `#F6E9DA` | `#5A3A1E` | `#AE7B50` |
| cat | `#FCE3EA` | `#7A2E45` | `#D2557A` |
| fox | `#FFE9D6` | `#7A3410` | `#DF601E` |
| frog | `#E6F4DD` | `#2F5E28` | `#509945` |
| rabbit | `#E9EDFB` | `#2E3A6E` | `#7983C1` |
| owl | `#EFE9F8` | `#4B3A6E` | `#9A7752` |
| panda | `#EEEFF2` | `#2F3338` | `#4A4F57` |
| lion | `#FFF0CC` | `#6B4A00` | `#B48019` |
| dog | `#E4EEF6` | `#24435E` | `#588BB7` |
| unicorn | `#FBE6F6` | `#6A2C5E` | `#C064A8` |
| elk | `#EFF0DA` | `#4A4A1A` | `#7D7A35` |
| seal | `#E5ECF2` | `#2D4256` | `#5F7C96` |
| otter | `#DFF1EA` | `#1F4F3F` | `#3F8C72` |
| badger | `#E8E9F3` | `#33385C` | `#5C6290` |
| sheep | `#F0ECF4` | `#4A4258` | `#857A99` |
| hedgehog | `#F7E6E6` | `#6A3438` | `#A8636A` |
| squirrel | `#FBE5DC` | `#6E2E17` | `#B0502C` |
| puffin | `#FFE6E1` | `#7A2A1F` | `#DE5A45` |
| Felles (og ukjent) | `#F4EFE6` | `#5C4A2A` | primary |

Mørkt tema (`darkPersonColors`): dyp, mettet tint, lys pastell som ink og en lysnet ring.

| Avatar | tint | ink | ring |
|---|---|---|---|
| bear | `#36281B` | `#EDCDA9` | `#C99A70` |
| cat | `#3D2129` | `#F6B9CB` | `#E57A98` |
| fox | `#3E2616` | `#F9BF96` | `#F0844A` |
| frog | `#1F301B` | `#BCE3B0` | `#6CBF5F` |
| rabbit | `#222840` | `#C3CBF4` | `#929CDA` |
| owl | `#2D2538` | `#D7C9F0` | `#B9946B` |
| panda | `#27292E` | `#DADDE2` | `#9AA1AB` |
| lion | `#382C0E` | `#F7D681` | `#E6AE34` |
| dog | `#1C2B38` | `#B5D2EC` | `#74A6D2` |
| unicorn | `#3A2132` | `#F0BCE2` | `#D682C0` |
| elk | `#2C2C16` | `#DCDCA6` | `#ABA85A` |
| seal | `#1F2A34` | `#BFD0E0` | `#8AA6C0` |
| otter | `#16302A` | `#A9DCC9` | `#5FB396` |
| badger | `#23253A` | `#C8CBE8` | `#9095C8` |
| sheep | `#2A2632` | `#D9D2E4` | `#A79CBC` |
| hedgehog | `#37201F` | `#EDBFC1` | `#CF8A90` |
| squirrel | `#3A2016` | `#F4BCA4` | `#E07A52` |
| puffin | `#3E2019` | `#F9B9AD` | `#F07A66` |
| Felles (og ukjent) | `#2E261D` | `#E8D3AC` | primary |

### Avrunding og avstand

- Avrunding: seksjonskort 24, kort 20, rader i kort 16, knapper 22 (pille), merkelapper 12,
  valgbrikker 14 (`filterChip`), tekstfelt og søkefelt 12 (`search`), ikonknapper sirkel.
- Avstand: sidepadding 20, mellom seksjoner 18, i kort 14, mellom rader 10.
- Bredde: innholdet er maks 640 bredt og sentrert på iPad (`contentMaxWidth`). Hver skjerm legger
  `...pageWidth` på innholdsbeholderen (`contentContainerStyle` i ScrollView og lister).
  `ModalFormScreen`, `Sheet` og `Toast` har det innebygd. Unntak: familieskjermen bruker hele
  bredden, med kolonner etter vindusbredden (`src/features/display/layout.ts`), og store rader
  (`large` på `TaskRow`, token `largeTouch`).
- Retning: iPhone er stående, iPad kan stå begge veier. Bruk ikke skjermbredden direkte til
  innhold som ligger i `pageWidth`.

## Fonter

Fredoka 600 til overskrifter, Nunito 400/600/700/800 til brødtekst. Lastes med
`@expo-google-fonts/*` og `expo-font` i `app/_layout.tsx` før noe vises (virker i Expo Go).
Med egne fonter velges vekten med familienavnet (`fonts.bold` = `Nunito_700Bold`), ikke
`fontWeight`. Bruk `<Text variant="…">`.

| Variant | Font | Størrelse | Bruk |
|---|---|---|---|
| pageTitle | Fredoka | 38 | sidetittel («I dag») |
| screenTitle | Fredoka | 28 | tittel på faner med egen topp («Oppgaver») |
| sectionTitle | Fredoka | 20 | seksjonstittel |
| groupTitle | Fredoka | 17 | gruppeoverskrift i et gruppekort |
| personName | Fredoka | 19 | navn på personkort |
| jobAmount | Fredoka | 22 | beløp på jobbkort |
| date | Nunito 700 | 15 | datoen over «I dag» |
| rowTitle | Nunito 700 | 16 | radtittel |
| rowTitleSmall / metaSmall | Nunito 700 / 400 | 15 / 12 | kompakte rader i gruppekort |
| jobTitle | Nunito 800 | 15 | tittel på jobbkort |
| body / bodyStrong | Nunito 400 / 700 | 16 | brødtekst, knapper |
| meta / metaStrong | Nunito 400 / 600 | 14 | metatekst |
| label | Nunito 700 | 13 | små etiketter, merkelapper, feltetiketter |
| hint | Nunito 400 | 13 | hjelpetekst under skjemafelt |
| count | Nunito 400 | 13 | antall i gruppeoverskrifter |
| segment | Nunito 800 | 14 | segmentert kontroll |
| search | Nunito 400 | 14 | søkefeltet |
| code | Fredoka | 32 | koder (koble til enhet) |
| tab / tabSelected | Nunito 700 / 800 | 12 | fanetekst |

## Komponenter (`src/ui/`)

| Komponent | Hva |
|---|---|
| `Text` | tekst med variant fra skalaen og valgfri `color` |
| `Card` | kort i `surface` med skygge (radius 20) |
| `SectionCard` | seksjon i personens `tint`, navn i `ink`, valgfri tekst til høyre («3 av 7 · 35 kr tjent») |
| `ShowMoreRow` | liten tekstrad med chevron som folder en liste ut og inn («4 til gjort i dag» / «Vis færre») |
| `TaskRow` | sjekkboks, tittel, metalinje, merkelapper til høyre. `done`, `muted` (i hvite kort) |
| `Checkbox` | sirkel 30, kant 2.5; avkrysset = fylt med ring-farge og hvit hake |
| `CheckRow` | velg i en liste (forslag fra hjemprofilen): sjekkboks, tittel, metalinje. Avkrysset = valgt, ingen gjennomstreking. `below` legger noe under metalinjen (brikken «Hvor ofte?») |
| `Chip` | merkelapp: `money`, `overdue`, `neutral` |
| `Button` | `primary` (pille), `secondary` (kant), `text`, `danger` (slett). `small` i rader og bannere. `accessibilityLabel` når tittelen alene er uklar («Fjern Skifte sengetøy») |
| `IconButton` | rund ikonknapp, 38, 40 eller 48 (hitSlop opp til 48) |
| `InfoButton` | lite (i)-ikon (20, `large` 26, `textMuted`, hitSlop opp til 48) som åpner «Slik gjør du». Settes med `onInfoPress` på `TaskRow`, `ListRow`, `CheckRow` og raden i «Oppgaver». Trykk på raden ellers er uendret |
| `IconBadge` | ikon i en flate (32/34/36/44), `shape` `round` eller `square` (radius 10), bare visning: kategori i «Oppgaver», og «Felles» der en person ellers har avatar |
| `Avatar` | tegnet SVG (react-native-svg), størrelse 22/32/44/48/100, valgfri `ring` |
| `AvatarStack` | overlappende avatarer (−10 px fra 32 og opp, ca. 30 % av størrelsen under). Flere enn `max`: en rund «+N» i `surfaceMuted` til slutt |
| `FamilyStrip` | alle i husstanden; trykk viser bare én person, trykk igjen viser alle. Opptil seks: én rad, ringen (maks 56 px) regnes ut fra antall og skjermbredde (`familyStripLayout.ts`). Sju eller flere: raden kan sveipes og falmer mot høyre. Navn: «Leah», «John M.», uten «…» |
| `ApprovalBanner` | gult banner: hvem som venter, antall og sum, knappen «Se» |
| `JobCard` / `JobGrid` | ekstrajobber. 1 = full bredde, 2–3 side om side, 4+ tre i bredden |
| `EmptyState` | tom liste: tittel og forklaring |
| `PageHeader` | stor sidetittel med linje over og knapp til høyre |
| `ListRow` | rad i lister (Årshjul, Husstand, historikk): tittel, metalinjer, merkelapp, høyreside, pil. `reserveChevron` holder av pilens plass når raden ikke kan trykkes, så (i), bryter og pil står likt på alle rader (årshjulet). Rader uten bryter får `right={<SwitchSpacer />}`: en usynlig bryter med nøyaktig samme størrelse |
| `Section` | seksjon på en side: tittel, forklaring og innhold |
| `GroupCard` | hvitt kort for én gruppe (radius 16, skygge, overflow hidden): overskrift øverst, rader med 1 px `border` mellom |
| `GroupHeader` | overskrift i et `GroupCard`, foldes ut og inn: ikon/avatar (34), navn, antall, pil ned (åpen) / høyre (lukket) (`accessibilityState.expanded`) |
| `SegmentedControl` | segmentert kontroll i full bredde («Hverdag \| Årshjul»). Valgt segment er en løftet flate med skygge |
| `FilterChips` | `ChoiceChip`-er på én rad som rulles sidelengs, aldri linjeskift (filteret i «Oppgaver») |
| `Message` / `Hint` | feil, bekreftelse eller nøytral tekst / hjelpetekst under et felt |
| `TextField` | kompakt tekstfelt med etikett: høyde 44, radius 12, 1 px `border`, tekst 16. `code` gir stor, sentrert tekst |
| `SearchField` | søkefelt (høyde 40, tekst 14): `TextField` med forstørrelsesglass og «Tøm søket» når det har tekst |
| `DateField` | datovelger med etikett. iOS: kompakt velger i raden, Android: knapp som åpner kalenderen. `minimumDate` stopper datoer bakover |
| `ChoiceChip` | den eneste valgbrikken i appen: høyde 32 (+ hitSlop 6 over og under = 44), radius 14, 1 px `border` på `surface`, tekst `label`. Valgt = fylt `primary` med `onPrimary`. Valgfritt `left` (avatar 20) eller `icon` (Ionicons 16, `textMuted`, `onPrimary` når valgt). `role="button"` når brikken åpner noe i stedet for å velge (hyppigheten i «Forslag til hverdagen») |
| `ChoiceChips`, `MultiChoiceChips` | ett eller flere valg med `ChoiceChip`, bryter linje (`flexWrap`, gap 6) så alle valg synes. Brukes i alle skjemaer |
| `Switch` | bryter i primary med lys tommel (`switchThumb`), med valgfri etikett |
| `Sheet` | boks over mørk bakgrunn, til korte valg og bekreftelser |
| `HowToSheet` / `HowToContent` | (`features/tasks/components/HowToSheet.tsx`) «Slik gjør du»: beskrivelsen og «Kilde: …» (lenke når malen har URL). `useHowToSheet()` gir arket og `infoPress(howTo)`. Hvem som får ikon, står i `features/tasks/howTo.ts`: maler og oppgaver fra årshjul, hjemprofil, intervall og sesong, og oppgaver uten mal som har beskrivelse. Rutiner («Re opp senga») får ikke ikon. Redigeringsskjermen viser beskrivelsen øverst for alle |
| `ModalFormScreen` | skjema som modal, med Avbryt og Lagre i headeren |
| `SwipeToDelete` | dra raden mot venstre: kort sveip viser «Slett», langt sveip (forbi 55 % av raden) sletter med en gang, som i Mail |
| `Toast` / `UndoToast` / `NoticeToast` | mørkt banner nederst. `UndoToast` har «Angre» i 5 s, `NoticeToast` er bare en kort melding i 3 s («Lagt i Årshjul») |
| `tabIcon` | Ionicons-ikon til fanene, fylt når valgt |
| `tabScreenOptions(colors)`, `modalScreenOptions(colors)`, `navigationTheme(scheme, colors)` | utseendet på fanelinjen, headerne og navigasjonen (`tabOptions.tsx`) |
| `ThemeProvider`, `useTheme`, `useAppearance`, `makeStyles` | temaet som vises, valget under «Utseende», temaavhengige stiler |

### «Oppgaver»

Egen topp (ingen navigasjonsheader): «Oppgaver» (`screenTitle`), en rund + (`IconButton` 38) og under dem
`SegmentedControl` («Hverdag | Årshjul»). Valget huskes per enhet (`features/tasks/tasksSegment.ts`,
`secureStorage`). `/tasks?view=year` velger Årshjul, og den gamle ruten `/year` sender dit.
Hvilket segment en oppgave står i, avgjør `taskSection` i `features/tasks/section.ts`: Årshjul for årlige
oppgaver, sesongoppgaver og intervaller på minst ca. 3 måneder (90 dager, 13 uker, 3 måneder eller år).
Alt annet står i Hverdag, også engangsoppgaver langt fram og ekstrajobber.
Etter lagring i et skjema som er åpnet fra «Oppgaver» (parameteren `from=tasks`, `FROM_TASKS`) byttes det
til segmentet oppgaven havnet i. I Årshjul rulles det til måneden, én gang. Var det et annet segment, vises
`NoticeToast` («Lagt i Årshjul» / «Lagt i Hverdag»). Skjemaer åpnet fra «I dag» rører ikke «Oppgaver».
Årsoppgaver er for voksne: når det skjemaet skal lagre, blir en årsoppgave (i «Ny oppgave», «Endre oppgave»
og «Ny årlig oppgave»), kan bare voksne og Felles velges, og hintet «Årsoppgaver er for voksne …» forklarer
hvorfor barna er borte. Et barn som allerede har en eksisterende årsoppgave, vises fortsatt som valgt
(`allowedAssignees` i `features/tasks/assignees.ts`).

**Hverdag** (`features/tasks/components/EverydayTasks.tsx`). + åpner «Hva vil du lage?»; med en person valgt i
filteret går den rett til `/task/new` med personen forhåndsvalgt. Under segmentene: `SearchField` og
`FilterChips` («Alle» + hver person med avatar på 20 px), bare i Hverdag. Én gruppe per kategori, hver gruppe er
ett `GroupCard` med 10 px mellom kortene. Ikonet i overskriften er `IconBadge shape="square"` i
`iconTint`/`primary`. Gruppene er lukket til de åpnes; enheten husker hvilke som er åpne
(`features/tasks/openGroups.ts`, `secureStorage`). Gruppen en oppgave havner i, åpnes når den lages eller
endres. Under søk er alle grupper med treff åpne. Kategoriene og ikonene står i `features/tasks/categories.ts`.
Ekstrajobbene står ikke i kategorigruppene, men i en egen gruppe «Ekstrajobber» (ikon `wallet-outline`)
nederst, etter kategoriene (`groupEveryday` i `features/tasks/taskGroups.ts`). Samme rekkefølge som i «I dag»:
faste oppgaver først, ekstrajobber etterpå. Gruppen vises bare når den har treff, og søk og personfilter virker
som ellers (filteret på et barn viser ekstrajobbene barnet kan ta).
Raden (`features/tasks/components/TaskRow.tsx`) er kompakt, uten ikon til venstre og uten pil: tittel og
undertittel «Hver torsdag · neste tor. 21. nov.» (engangs: bare datoen). Til høyre: «Forfalt» som
`Chip tone="overdue"` (aldri i undertittelen), lønn som `Chip tone="money"`, og avatarene (24 px, overlappende)
til de tildelte. Felles oppgaver og jobber uten barn får et lite nøytralt personer-ikon. Innholdet ligger i
`pageWidth`.
Like oppgaver for flere personer er én rad med alle avatarene (`bundleTasks` i
`features/tasks/taskGroups.ts`: samme mal, eller samme tittel, kategori og gjentakelse). Raden viser nærmeste
frist, «Forfalt» hvis én er forfalt, og lønnsspenn («10–20 kr»). Trykk åpner «Hvem sin oppgave vil du endre?»
(`MemberPickerModal`), sveip-slett sletter alle i raden, og «Angre» henter alle tilbake. Antallet i
overskriften teller rader. Bare visningen: hver person har fortsatt sin egen oppgave.

**Årshjul** (`features/templates/components/YearWheel.tsx`). Januar til desember, så «Med jevne mellomrom»
(lange intervaller, raden viser «Hver 3. måned · neste i mars»). Maler med bryter (`TemplateRow`) og egne
oppgaver merket «Egen» (`OwnYearTaskRow`), begge `ListRow`. Voksne kan trykke på en egen oppgave, eller en
mal som er på, for å endre oppgaven. Øverst en kort forklaring, «Velg anbefalte» og «Fortell om hjemmet for
flere forslag» (voksne). + åpner «Ny årlig oppgave» og vises bare for voksne. Ikke personfilter.
Trykk på en rad som ikke åpner oppgaven (mal som er av, eller barn), viser «Slik gjør du».
`SearchField` («Søk i årshjulet») under segmentene søker på tittel i husstandens årshjul-oppgaver og malene
(`features/templates/yearSearch.ts`, samme treffregel som Hverdag). Bare måneder med treff vises, med
månedsoverskriften; forklaringen, beredskapskortet og knappene skjules under søk. Gir det ingen treff, vises
treff blant malene som ikke passer hjemprofilen under «Passer kanskje ikke hjemmet ditt», med måneden i
metalinjen. De slås på med bryteren som vanlig. Ingen treff i det hele tatt: «Ingen treff på «…».». Tomt søk
viser årshjulet som før.

Hjelpefunksjoner: `useTheme().personColor(avatar)`, `waitingText(names)` («Leah, Jesper og 2 til venter»),
`jobColumns(count)`, `contrastRatio(a, b)`.

### Skjemaene

Ny og endre oppgave, «Oppgave i dag», ny og endre jobb og årshjulsoppgaven bruker samme brikker og
felt som «Oppgaver». Alle valg er `ChoiceChips`/`MultiChoiceChips` som bryter linje, aldri sidelengs rulling.
«Hvem har ansvaret?» / «For hvem?»: hver person med avatar 20 (`left`), «Felles» og «Alle barna» med
ikonet `people-outline`. «Kategori»: kategoriens ikon fra `features/tasks/categories.ts`, samme som i
gruppeoverskriftene. Gjentakelse, ukedager og måneder: samme brikke uten ikon.

### «Forslag til hverdagen»

`features/templates/components/RoutineSuggestionsFlow.tsx`, i oppstarten (husstand → barn → hverdagen →
hjemmet) og som modal fra Innstillinger → «Hjemmet». Seksjonen «Felles» («Forslag til deg» for enslige,
uten forklaring), så én `Section` per barn med «Leah, 9 år» og avatar 32 til høyre. Hver rad er en
`CheckRow` med eventuell lønn som meta («20 kr») og hyppigheten som en `ChoiceChip` (`role="button"`, ikon
`repeat-outline`) under: «Annenhver søndag». Trykk åpner `Sheet` «Hvor ofte?» med `ChoiceChips`: malens hyppighet
først (standard), så hver dag, hver uke, annenhver uke og hver måned (`frequencyOptions` i
`features/templates/routines.ts`). Valget huker av raden og gjelder bare oppgaven som lages, aldri malen. Noen få
rader er avhuket fra start. Barn uten fødselsår får en `Hint` om å legge det inn. «Legg til (n)», og «Hopp over»
(«Fortsett» når noe alt er lagt til) eller «Ikke nå».
Det som er lagt til, står dempet nederst i seksjonen med `Chip` «Lagt til» og oppgavens egen hyppighet (ingen brikke).
«Fjern» under raden arkiverer oppgaven (historikken blir stående) og gjør forslaget valgbart igjen. I oppstarten skjer
det uten spørsmål, i Innstillinger etter «Fjerne «…»? Oppgaven forsvinner fra Oppgaver.».

### Oppstarten

`app/(app)/onboarding.tsx`. Stegene står i `features/household/onboardingSteps.ts` (barnesteget bare for familie).
Hvert steg har «Tilbake» og nederst «Du kan endre dette senere under Innstillinger.» (barnesteget har sin egen
setning). Ingenting lages to ganger: går man tilbake til første steg, er skjemaet utfylt og «Lagre og fortsett»
oppdaterer bare det som er endret. Barna leses fra databasen; trykk på et barn endrer eller fjerner det.
Forslagene regnes ut på nytt fra oppgavene, så det som er lagt til, står som «Lagt til». Hjemprofilen huskes i
skjermen, fordi husstanden ikke kan hentes på nytt før oppstarten er ferdig (da vises fanene).

## Avatarer

Nøklene i `members.avatar` er uendret (`features/household/avatars.ts`). Tegningene ligger i
`src/ui/avatarArt.tsx` (viewBox 0 0 48 48): sirkelbakgrunn, enkle flate former, to prikkøyne,
ingen omriss. En ny avatar trenger en tegning der, en farge i `personColors` og en `label`.
Ukjente nøkler (f.eks. en eldre app som ser en nyere figur) vises som reven (`avatarArtFor`,
`FALLBACK_AVATAR`) med de nøytrale Felles-fargene, aldri tomt (`features/household/__tests__/avatars.test.ts`).
Figurene: bjørn, katt, rev, frosk, kanin, ugle, panda, løve, hund, enhjørning, og de roligere elg, sel, oter,
grevling og sau (passer også voksne), pinnsvin, ekorn og lunde.
Voksne bytter egen figur på personskjermen (`app/(app)/member/[id].tsx`, «Figuren din»), som åpnes fra
«Husstand» eller «Din profil» øverst i Innstillinger. Den lagres med en gang via `set_my_avatar`.
Barnas figur endres i «Endre barn», og andre voksnes figur kan ikke endres. Tegningene er like i begge temaer: de er
«klistremerker» med lys pastellsirkel, som synes godt mot mørk flate (mørkere sirkler ville gjort
bjørn, hund og pandaørene nesten usynlige). `AvatarPicker` viser dem i tre kolonner, valgt med
3 px primary-kant.

## Ikke ennå

Utsett-knapp.
