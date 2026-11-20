// Designsystemet «Varm og leken» (A4). Den eneste kilden til farger, fonter, avrunding og avstand.
// Fargene finnes i et lyst og et mørkt sett. Komponenter henter riktig sett med useTheme() eller
// makeStyles(), aldri direkte herfra. Se docs/DESIGN.md.
import type { TextStyle, ViewStyle } from 'react-native';

/** Lyst eller mørkt tema. */
export type Scheme = 'light' | 'dark';

export const lightColors = {
  background: '#FFFDF7',
  surface: '#FFFFFF',
  /** Rader inne i kort. */
  surfaceMuted: '#FAF6EF',
  border: '#F1EBE1',
  borderStrong: '#E4DCCF',
  checkboxBorder: '#A08A6C',
  text: '#2B2118',
  textMuted: '#6B5E52',
  textWarm: '#5C4A2A',
  primary: '#0E6E6E',
  primaryPressed: '#0A5252',
  onPrimary: '#FFFFFF',
  sun: '#F2B705',
  /** Godkjenningsbanner og framheving. */
  sunSoft: '#FFF4D1',
  moneyBg: '#FFF1C2',
  moneyText: '#6E4D00',
  overdueBg: '#FDE4E1',
  overdueText: '#A3271A',
  jobBg: '#E3F3F1',
  jobAmount: '#0E4F4F',
  jobSub: '#33504D',
  /** Segmentert kontroll: bakgrunnen og det valgte segmentet. */
  segmentBg: '#F2ECE2',
  segmentSelected: '#FFFFFF',
  /** Lys teal flate bak kategoriikoner. */
  iconTint: '#E3F3F1',
  /** Feilmeldinger. Samme røde som «Forfalt». */
  danger: '#A3271A',
  /** Mørk bakgrunn bak modaler. */
  backdrop: 'rgba(43,33,24,0.4)',
  /** Banneret nederst etter avkrysning og sletting («Angre»). */
  toastBg: '#2B2118',
  toastText: '#FFFFFF',
  toastMuted: '#D9CFC4',
  toastAction: '#F2B705',
  /** Haken i en avkrysset sjekkboks (på personens ring-farge). */
  onRing: '#FFFFFF',
  /** QR-koden er alltid mørk på lys, også i mørkt tema: mange skannere leser ikke invertert QR. */
  qrInk: '#2B2118',
  qrBg: '#FFFFFF',
  /** Bak kameraet før bildet kommer. */
  cameraBg: '#000000',
  /** Tommelen på bryteren. Lys i begge tema, som standard på iOS. */
  switchThumb: '#FFFFFF',
};

export type ThemeColors = typeof lightColors;

/** Samme A4-uttrykk i mørkt: varm mørkebrun, lyse pasteller som tekst. */
export const darkColors: ThemeColors = {
  background: '#1C1712',
  surface: '#28211A',
  surfaceMuted: '#322A21',
  border: '#3A3128',
  borderStrong: '#4D4236',
  checkboxBorder: '#857563',
  text: '#F5EDE1',
  textMuted: '#BFB1A0',
  textWarm: '#E8D3AC',
  primary: '#5CBDB6',
  primaryPressed: '#4AA59F',
  onPrimary: '#14201F',
  sun: '#F2B705',
  sunSoft: '#3A2F14',
  moneyBg: '#3D3112',
  moneyText: '#F4C95D',
  overdueBg: '#43201A',
  overdueText: '#FFA294',
  jobBg: '#173230',
  jobAmount: '#93DCD5',
  jobSub: '#B8D4CF',
  segmentBg: '#231D17',
  segmentSelected: '#3A3128',
  iconTint: '#173230',
  danger: '#FF9585',
  backdrop: 'rgba(0,0,0,0.6)',
  /** I mørkt løftes banneret lysere enn flaten under. */
  toastBg: '#463B30',
  toastText: '#FFF8EE',
  toastMuted: '#D6C9B8',
  toastAction: '#F7C843',
  onRing: '#14201F',
  qrInk: '#2B2118',
  qrBg: '#FFFFFF',
  cameraBg: '#000000',
  switchThumb: '#FFFFFF',
};

/** Myk skygge under kort. elevation er Android. I mørkt gjør flatenes lyshet mesteparten av jobben. */
export const lightShadow: ViewStyle = {
  shadowColor: '#2B2118',
  shadowOpacity: 0.07,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export const darkShadow: ViewStyle = { ...lightShadow, shadowColor: '#000000', shadowOpacity: 0.35 };

export const radius = {
  section: 24,
  card: 20,
  row: 16,
  button: 22,
  chip: 12,
  /** Gruppekortene i «Oppgaver». */
  group: 16,
  /** Søkefeltet. */
  search: 12,
  /** Segmentert kontroll (ytre). Segmentene inni har segment - 3. */
  segment: 11,
  /** Små filterbrikker. */
  filterChip: 14,
  round: 999,
} as const;

export const spacing = {
  /** Sidepadding. */
  page: 20,
  /** Mellom seksjoner. */
  section: 18,
  /** Inne i kort. */
  card: 14,
  /** Mellom rader. */
  row: 10,
  /** Luft nederst i lister med flytende pluss (AddFab), så knappen aldri dekker den nederste raden. */
  fabClearance: 120,
} as const;

/** Den flytende plussknappen (AddFab): størrelse og avstand fra kanten nederst. */
export const fab = {
  size: 56,
  margin: 16,
  /** Toastene ligger så mye over knappen når den vises. */
  toastGap: 12,
} as const;

/** Største bredde på innholdet. Mobil er smalere og merker ingenting; på iPad blir det en midtstilt spalte. */
export const contentMaxWidth = 640;

/**
 * Legg på sidens innholdsbeholder (også contentContainerStyle i ScrollView og lister):
 * full bredde opp til contentMaxWidth, deretter sentrert.
 */
export const pageWidth: ViewStyle = { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' };

/** Minste trykkflate (bredde og høyde). */
export const minTouch = 44;

/** Radhøyde på familieskjermen, der flere trykker på en skjerm på avstand. */
export const largeTouch = 68;

/**
 * Familienavnene fontene lastes med i app/_layout.tsx. Med egne fonter velges vekten med
 * familienavnet. fontWeight virker ikke på Android, så den brukes ikke.
 */
export const fonts = {
  heading: 'Fredoka_600SemiBold',
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

/** Tekstskalaen. Brukes av <Text variant="…"> i src/ui/Text.tsx. */
export const typography = {
  pageTitle: { fontFamily: fonts.heading, fontSize: 38, lineHeight: 44 },
  /** Tittel øverst på faner med egen topp, som «Oppgaver». */
  screenTitle: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34 },
  /** Gruppeoverskrift i et kort. */
  groupTitle: { fontFamily: fonts.heading, fontSize: 17, lineHeight: 22 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26 },
  personName: { fontFamily: fonts.heading, fontSize: 19, lineHeight: 24 },
  jobAmount: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28 },
  date: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  /** Kompakte rader i gruppekort. */
  rowTitleSmall: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  rowTitleLarge: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 25 },
  jobTitle: { fontFamily: fonts.extrabold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  metaStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  /** Undertittel på kompakte rader. */
  metaSmall: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17 },
  /** Antall i gruppeoverskrifter. */
  count: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  /** Segmentert kontroll. */
  segment: { fontFamily: fonts.extrabold, fontSize: 14, lineHeight: 19 },
  /** Søkefelt (kompakt). */
  search: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  /** Hjelpetekst under skjemafelt. */
  hint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  /** Store koder (koble til enhet). */
  code: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 40, letterSpacing: 4 },
  tab: { fontFamily: fonts.bold, fontSize: 12 },
  tabSelected: { fontFamily: fonts.extrabold, fontSize: 12 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/**
 * Farge per person, styrt av avatarnøkkelen.
 * tint = seksjonsbakgrunn, ink = overskrift på tint, ring = ring rundt avatar og avkrysset sjekkboks.
 */
export type PersonColor = { tint: string; ink: string; ring: string };

export const lightPersonColors: Record<string, PersonColor> = {
  bear: { tint: '#F6E9DA', ink: '#5A3A1E', ring: '#AE7B50' },
  cat: { tint: '#FCE3EA', ink: '#7A2E45', ring: '#D2557A' },
  fox: { tint: '#FFE9D6', ink: '#7A3410', ring: '#DF601E' },
  frog: { tint: '#E6F4DD', ink: '#2F5E28', ring: '#509945' },
  rabbit: { tint: '#E9EDFB', ink: '#2E3A6E', ring: '#7983C1' },
  // Ringen er brun som ugla i tegningen, ikke lilla som tinten.
  owl: { tint: '#EFE9F8', ink: '#4B3A6E', ring: '#9A7752' },
  panda: { tint: '#EEEFF2', ink: '#2F3338', ring: '#4A4F57' },
  lion: { tint: '#FFF0CC', ink: '#6B4A00', ring: '#B48019' },
  dog: { tint: '#E4EEF6', ink: '#24435E', ring: '#588BB7' },
  unicorn: { tint: '#FBE6F6', ink: '#6A2C5E', ring: '#C064A8' },
  elk: { tint: '#EFF0DA', ink: '#4A4A1A', ring: '#7D7A35' },
  seal: { tint: '#E5ECF2', ink: '#2D4256', ring: '#5F7C96' },
  otter: { tint: '#DFF1EA', ink: '#1F4F3F', ring: '#3F8C72' },
  badger: { tint: '#E8E9F3', ink: '#33385C', ring: '#5C6290' },
  sheep: { tint: '#F0ECF4', ink: '#4A4258', ring: '#857A99' },
  hedgehog: { tint: '#F7E6E6', ink: '#6A3438', ring: '#A8636A' },
  squirrel: { tint: '#FBE5DC', ink: '#6E2E17', ring: '#B0502C' },
  penguin: { tint: '#FFE6E1', ink: '#7A2A1F', ring: '#DE5A45' },
};

/** Mørk variant: dyp, mettet tint, lys pastell som ink og en lysnet ring. */
export const darkPersonColors: Record<string, PersonColor> = {
  bear: { tint: '#36281B', ink: '#EDCDA9', ring: '#C99A70' },
  cat: { tint: '#3D2129', ink: '#F6B9CB', ring: '#E57A98' },
  fox: { tint: '#3E2616', ink: '#F9BF96', ring: '#F0844A' },
  frog: { tint: '#1F301B', ink: '#BCE3B0', ring: '#6CBF5F' },
  rabbit: { tint: '#222840', ink: '#C3CBF4', ring: '#929CDA' },
  owl: { tint: '#2D2538', ink: '#D7C9F0', ring: '#B9946B' },
  panda: { tint: '#27292E', ink: '#DADDE2', ring: '#9AA1AB' },
  lion: { tint: '#382C0E', ink: '#F7D681', ring: '#E6AE34' },
  dog: { tint: '#1C2B38', ink: '#B5D2EC', ring: '#74A6D2' },
  unicorn: { tint: '#3A2132', ink: '#F0BCE2', ring: '#D682C0' },
  elk: { tint: '#2C2C16', ink: '#DCDCA6', ring: '#ABA85A' },
  seal: { tint: '#1F2A34', ink: '#BFD0E0', ring: '#8AA6C0' },
  otter: { tint: '#16302A', ink: '#A9DCC9', ring: '#5FB396' },
  badger: { tint: '#23253A', ink: '#C8CBE8', ring: '#9095C8' },
  sheep: { tint: '#2A2632', ink: '#D9D2E4', ring: '#A79CBC' },
  hedgehog: { tint: '#37201F', ink: '#EDBFC1', ring: '#CF8A90' },
  squirrel: { tint: '#3A2016', ink: '#F4BCA4', ring: '#E07A52' },
  penguin: { tint: '#3E2019', ink: '#F9B9AD', ring: '#F07A66' },
};

/** «Felles»-seksjonen, og reserve for ukjente avatarnøkler. */
export const lightSharedColors: PersonColor = { tint: '#F4EFE6', ink: '#5C4A2A', ring: lightColors.primary };
export const darkSharedColors: PersonColor = { tint: '#2E261D', ink: '#E8D3AC', ring: darkColors.primary };

/** Alt som skifter mellom lyst og mørkt. Hentes med useTheme() i src/ui/ThemeProvider.tsx. */
export type Theme = {
  scheme: Scheme;
  colors: ThemeColors;
  shadow: ViewStyle;
  personColors: Record<string, PersonColor>;
  sharedColors: PersonColor;
};

export const themes: Record<Scheme, Theme> = {
  light: {
    scheme: 'light',
    colors: lightColors,
    shadow: lightShadow,
    personColors: lightPersonColors,
    sharedColors: lightSharedColors,
  },
  dark: {
    scheme: 'dark',
    colors: darkColors,
    shadow: darkShadow,
    personColors: darkPersonColors,
    sharedColors: darkSharedColors,
  },
};

/** Personens farger i et tema. Ukjent eller manglende avatar gir «Felles»-fargene. */
export function personColorIn(theme: Theme, avatarKey: string | null | undefined): PersonColor {
  return (avatarKey && theme.personColors[avatarKey]) || theme.sharedColors;
}
