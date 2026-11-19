# Designsystem: «Varm og leken» (A4)

Ett visuelt uttrykk for hele appen: varme, lyse flater, en rolig petrol som hovedfarge, en
egen farge per person og tegnede dyreavatarer. Finnes i lyst og mørkt tema med samme uttrykk:
i mørkt er bakgrunnen varm mørkebrun (ikke kald grå/svart) og teksten lyse pasteller.

Alt ligger i `src/ui/`. Tokenene er i `src/ui/theme.ts`, og komponentene importeres fra
`src/ui` (`import { Card, Text } from '../src/ui'`).

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
| jobBg / jobAmount / jobSub | `#E3F3F1` / `#0E4F4F` / `#33504D` | `#173230` / `#93DCD5` / `#B8D4CF` | ledige jobber |
| danger | `#A3271A` | `#FF9585` | feilmeldinger, «Slett»-knapper |
| backdrop | `rgba(43,33,24,0.4)` | `rgba(0,0,0,0.6)` | bak modaler |
| toastBg / toastText / toastMuted / toastAction | `#2B2118` / `#FFFFFF` / `#D9CFC4` / `#F2B705` | `#463B30` / `#FFF8EE` / `#D6C9B8` / `#F7C843` | banneret med «Angre» (i mørkt lysere enn flaten) |
| onRing | `#FFFFFF` | `#14201F` | haken i avkrysset sjekkboks |
| qrInk / qrBg | `#2B2118` / `#FFFFFF` | samme | QR-koden, alltid mørk på lys |
| cameraBg | `#000000` | `#000000` | bak kameraet |

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
| Felles (og ukjent) | `#2E261D` | `#E8D3AC` | primary |

### Avrunding og avstand

- Avrunding: seksjonskort 24, kort 20, rader i kort 16, knapper 22 (pille), merkelapper 12,
  ikonknapper sirkel.
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
| sectionTitle | Fredoka | 20 | seksjonstittel |
| personName | Fredoka | 19 | navn på personkort |
| jobAmount | Fredoka | 22 | beløp på jobbkort |
| date | Nunito 700 | 15 | datoen over «I dag» |
| rowTitle | Nunito 700 | 16 | radtittel |
| jobTitle | Nunito 800 | 15 | tittel på jobbkort |
| body / bodyStrong | Nunito 400 / 700 | 16 | brødtekst, knapper |
| meta / metaStrong | Nunito 400 / 600 | 14 | metatekst |
| label | Nunito 700 | 13 | små etiketter, merkelapper, feltetiketter |
| hint | Nunito 400 | 13 | hjelpetekst under skjemafelt |
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
| `CheckRow` | velg i en liste (forslag fra hjemprofilen): sjekkboks, tittel, metalinje. Avkrysset = valgt, ingen gjennomstreking |
| `Chip` | merkelapp: `money`, `overdue`, `neutral` |
| `Button` | `primary` (pille), `secondary` (kant), `text`, `danger` (slett). `small` i rader og bannere |
| `IconButton` | rund ikonknapp, 40 eller 48 |
| `IconBadge` | ikon i en rund flate (32/36/44), bare visning: kategori i «Oppgaver», og «Felles» der en person ellers har avatar |
| `Avatar` | tegnet SVG (react-native-svg), størrelse 22/32/44/48/100, valgfri `ring` |
| `AvatarStack` | overlappende avatarer (−10 px) |
| `FamilyStrip` | alle i husstanden; trykk viser bare én person, trykk igjen viser alle. Opptil seks: én rad, ringen (maks 56 px) regnes ut fra antall og skjermbredde (`familyStripLayout.ts`). Sju eller flere: raden kan sveipes og falmer mot høyre. Navn: «Leah», «John M.», uten «…» |
| `ApprovalBanner` | gult banner: hvem som venter, antall og sum, knappen «Se» |
| `JobCard` / `JobGrid` | ledige jobber. 1 = full bredde, 2–3 side om side, 4+ tre i bredden |
| `EmptyState` | tom liste: tittel og forklaring |
| `PageHeader` | stor sidetittel med linje over og knapp til høyre |
| `ListRow` | rad i lister (Oppgaver, Årshjul, Husstand, historikk): tittel, metalinjer, merkelapp, høyreside, pil |
| `Section` | seksjon på en side: tittel, forklaring og innhold |
| `GroupHeader` | overskrift på en gruppe som foldes ut og inn: ikon/avatar, navn, antall, pil opp/ned (`accessibilityState.expanded`) |
| `Message` / `Hint` | feil, bekreftelse eller nøytral tekst / hjelpetekst under et felt |
| `TextField` | tekstfelt med etikett. `code` gir stor, sentrert tekst |
| `SearchField` | søkefelt: `TextField` med forstørrelsesglass og «Tøm søket» når det har tekst |
| `DateField` | datovelger med etikett. iOS: kompakt velger i raden, Android: knapp som åpner kalenderen. `minimumDate` stopper datoer bakover |
| `ChoiceChip`, `ChoiceChips`, `MultiChoiceChips` | valgknapper (ett eller flere valg). Valgt = fylt primary |
| `Switch` | bryter i primary, med valgfri etikett |
| `Sheet` | boks over mørk bakgrunn, til korte valg og bekreftelser |
| `ModalFormScreen` | skjema som modal, med Avbryt og Lagre i headeren |
| `SwipeToDelete` | dra raden mot venstre: kort sveip viser «Slett», langt sveip (forbi 55 % av raden) sletter med en gang, som i Mail |
| `Toast` / `UndoToast` | mørkt banner nederst med «Angre» |
| `tabIcon` | Ionicons-ikon til fanene, fylt når valgt |
| `tabScreenOptions(colors)`, `modalScreenOptions(colors)`, `navigationTheme(scheme, colors)` | utseendet på fanelinjen, headerne og navigasjonen (`tabOptions.tsx`) |
| `ThemeProvider`, `useTheme`, `useAppearance`, `makeStyles` | temaet som vises, valget under «Utseende», temaavhengige stiler |

### «Oppgaver»

Søkefelt, «Kategori | Person» og personfilter («Alle» + hver person) øverst. Gruppene (`GroupHeader`)
er lukket til de åpnes; enheten husker hvilke som er åpne (`features/tasks/openGroups.ts`,
`secureStorage`). Gruppen en oppgave havner i, åpnes når den lages eller endres. Under søk er alle
grupper med treff åpne. Kategoriene og ikonene står i `features/tasks/categories.ts`.
Raden (`features/tasks/components/TaskRow.tsx`): avatar(er) til venstre (`IconBadge` for felles),
undertittel «Hver torsdag · neste tor. 21. nov.» (engangs: bare datoen; forfalt: «Forfalt»),
lønn som `Chip tone="money"`. I Person-visningen står kategorien først i undertittelen.

Hjelpefunksjoner: `useTheme().personColor(avatar)`, `waitingText(names)` («Leah, Jesper og 2 til venter»),
`jobColumns(count)`, `contrastRatio(a, b)`.

## Avatarer

Nøklene i `members.avatar` er uendret (`features/household/avatars.ts`). Tegningene ligger i
`src/ui/avatarArt.tsx` (viewBox 0 0 48 48): sirkelbakgrunn, enkle flate former, to prikkøyne,
ingen omriss. En ny avatar trenger en tegning der, en farge i `personColors` og en `label`.
Ukjente nøkler vises som et nøytralt fjes. Tegningene er like i begge temaer: de er
«klistremerker» med lys pastellsirkel, som synes godt mot mørk flate (mørkere sirkler ville gjort
bjørn, hund og pandaørene nesten usynlige). `AvatarPicker` viser dem i tre kolonner, valgt med
3 px primary-kant.

## Ikke ennå

Utsett-knapp.
