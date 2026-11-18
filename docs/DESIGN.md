# Designsystem: «Varm og leken» (A4)

Ett visuelt uttrykk for hele appen: varme, lyse flater, en rolig petrol som hovedfarge, en
egen farge per person og tegnede dyreavatarer. Appen er bare i lys modus.

Alt ligger i `src/ui/`. Tokenene er i `src/ui/theme.ts`, og komponentene importeres fra
`src/ui` (`import { Card, Text } from '../src/ui'`).

## Regler

- All ny UI bruker komponentene i `src/ui` og tokenene i `theme.ts`. Ingen hardkodede farger,
  fontstørrelser eller `fontWeight` i skjermfiler. Tegningene i `avatarArt.tsx` er unntaket.
- All tekst har minst **4.5:1** kontrast mot bakgrunnen. Testen `src/ui/__tests__/ui.test.ts`
  sjekker alle tekstpar. Legger du til en farge, legg paret til i testen.
- Trykkflater er minst **44 × 44**.
- **Forfalt** vises som merkelapp (`Chip tone="overdue"`) til høyre på raden, **aldri med dato**.
- Utført rad: tittelen gjennomstreket i `textMuted`, sjekkboksen fylt med personens ring-farge.
  I «I dag» står dagens utførte nederst i kortet, med «Gjort av …» når en annen enn den ansvarlige
  gjorde det. Trykk angrer innen 10 minutter. Har kortet ingenting igjen: «Alt er gjort i dag!».
- Personfarger styres av avatarnøkkelen (`personColor(member.avatar)`), aldri av navn eller rolle.
- Bare lys modus. `app.json` har `userInterfaceStyle: "light"`.

## Tokens

### Farger

| Token | Verdi | Bruk |
|---|---|---|
| background | `#FFFDF7` | sidebakgrunn |
| surface | `#FFFFFF` | kort, rader på farget bakgrunn |
| surfaceMuted | `#FAF6EF` | rader inne i hvite kort |
| border / borderStrong | `#F1EBE1` / `#E4DCCF` | skiller, kant på sekundærknapp |
| checkboxBorder | `#C9BDAC` | tom sjekkboks |
| text / textMuted / textWarm | `#2B2118` / `#6B5E52` / `#5C4A2A` | tekst |
| primary / primaryPressed / onPrimary | `#0E6E6E` / `#0A5252` / `#FFFFFF` | knapper, valgt fane |
| sun / sunSoft | `#F2B705` / `#FFF4D1` | godkjenningsbanner, framheving |
| moneyBg / moneyText | `#FFF1C2` / `#6E4D00` | lønn |
| overdueBg / overdueText | `#FDE4E1` / `#A3271A` | forfalt |
| jobBg / jobAmount / jobSub | `#E3F3F1` / `#0E4F4F` / `#33504D` | ledige jobber |
| danger | `#A3271A` | feilmeldinger, «Slett»-knapper |
| backdrop | `rgba(43,33,24,0.4)` | bak modaler |
| toastBg / toastText / toastMuted / toastAction | `#2B2118` / `#FFFFFF` / `#D9CFC4` / `#F2B705` | banneret med «Angre» |
| cameraBg | `#000000` | bak kameraet |

Skygge (`shadow`): 0 2 10 `rgba(43,33,24,0.07)`, `elevation: 2` på Android.

### Farge per person

`tint` = seksjonsbakgrunn, `ink` = overskrift på tint, `ring` = ring rundt avatar og avkrysset sjekkboks.

| Avatar | tint | ink | ring |
|---|---|---|---|
| bear | `#F6E9DA` | `#5A3A1E` | `#B07D52` |
| cat | `#FCE3EA` | `#7A2E45` | `#D2557A` |
| fox | `#FFE9D6` | `#7A3410` | `#E36B2C` |
| frog | `#E6F4DD` | `#2F5E28` | `#58A84C` |
| rabbit | `#E9EDFB` | `#2E3A6E` | `#7C86C2` |
| owl | `#EFE9F8` | `#4B3A6E` | `#9A7752` |
| panda | `#EEEFF2` | `#2F3338` | `#4A4F57` |
| lion | `#FFF0CC` | `#6B4A00` | `#D99A1E` |
| dog | `#E4EEF6` | `#24435E` | `#5B8DB8` |
| unicorn | `#FBE6F6` | `#6A2C5E` | `#C064A8` |
| Felles (og ukjent) | `#F4EFE6` | `#5C4A2A` | primary |

### Avrunding og avstand

- Avrunding: seksjonskort 24, kort 20, rader i kort 16, knapper 22 (pille), merkelapper 12,
  ikonknapper sirkel.
- Avstand: sidepadding 20, mellom seksjoner 18, i kort 14, mellom rader 10.

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
| `Card` | hvitt kort med skygge (radius 20) |
| `SectionCard` | seksjon i personens `tint`, navn i `ink`, valgfri tekst til høyre («35 kr tjent») |
| `TaskRow` | sjekkboks, tittel, metalinje, merkelapper til høyre. `done`, `muted` (i hvite kort) |
| `Checkbox` | sirkel 30, kant 2.5; avkrysset = fylt med ring-farge og hvit hake |
| `Chip` | merkelapp: `money`, `overdue`, `neutral` |
| `Button` | `primary` (pille), `secondary` (kant), `text`, `danger` (slett). `small` i rader og bannere |
| `IconButton` | rund ikonknapp, 40 eller 48 |
| `Avatar` | tegnet SVG (react-native-svg), størrelse 22/32/44/48/100, valgfri `ring` |
| `AvatarStack` | overlappende avatarer (−10 px) |
| `FamilyStrip` | alle i husstanden; trykk viser bare én person, trykk igjen viser alle. Opptil seks: én rad, ringen (maks 56 px) regnes ut fra antall og skjermbredde (`familyStripLayout.ts`). Sju eller flere: raden kan sveipes og falmer mot høyre. Navn: «Leah», «John M.», uten «…» |
| `ApprovalBanner` | gult banner: hvem som venter, antall og sum, knappen «Se» |
| `JobCard` / `JobGrid` | ledige jobber. 1 = full bredde, 2–3 side om side, 4+ tre i bredden |
| `EmptyState` | tom liste: tittel og forklaring |
| `PageHeader` | stor sidetittel med linje over og knapp til høyre |
| `ListRow` | rad i lister (Oppgaver, Årshjul, Husstand, historikk): tittel, metalinjer, merkelapp, høyreside, pil |
| `Section` | seksjon på en side: tittel, forklaring og innhold |
| `Message` / `Hint` | feil, bekreftelse eller nøytral tekst / hjelpetekst under et felt |
| `TextField` | tekstfelt med etikett. `code` gir stor, sentrert tekst |
| `ChoiceChip`, `ChoiceChips`, `MultiChoiceChips` | valgknapper (ett eller flere valg). Valgt = fylt primary |
| `Switch` | bryter i primary, med valgfri etikett |
| `Sheet` | boks over mørk bakgrunn, til korte valg og bekreftelser |
| `ModalFormScreen` | skjema som modal, med Avbryt og Lagre i headeren |
| `SwipeToDelete` | dra raden mot venstre: kort sveip viser «Slett», langt sveip (forbi 55 % av raden) sletter med en gang, som i Mail |
| `Toast` / `UndoToast` | mørkt banner nederst med «Angre» |
| `tabIcon` | Ionicons-ikon til fanene, fylt når valgt |
| `tabScreenOptions`, `modalScreenOptions` | utseendet på fanelinjen og headerne (`tabOptions.tsx`) |

Hjelpefunksjoner: `personColor(avatar)`, `waitingText(names)` («Leah, Jesper og 2 til venter»),
`jobColumns(count)`, `contrastRatio(a, b)`.

## Avatarer

Nøklene i `members.avatar` er uendret (`features/household/avatars.ts`). Tegningene ligger i
`src/ui/avatarArt.tsx` (viewBox 0 0 48 48): sirkelbakgrunn, enkle flate former, to prikkøyne,
ingen omriss. En ny avatar trenger en tegning der, en farge i `personColors` og en `label`.
Ukjente nøkler vises som et nøytralt fjes. `AvatarPicker` viser dem i tre kolonner, valgt med
3 px primary-kant.

## Ikke ennå

Mørk modus, profilbilder, utsett-knapp, hjemprofil.
