// Designsystemet «Varm og leken» (A4). Den eneste kilden til farger, fonter, avrunding og avstand.
// Skjermfiler skal ikke ha egne fargekoder: bruk disse tokenene. Se docs/DESIGN.md.
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#FFFDF7',
  surface: '#FFFFFF',
  /** Rader inne i kort. */
  surfaceMuted: '#FAF6EF',
  border: '#F1EBE1',
  borderStrong: '#E4DCCF',
  checkboxBorder: '#C9BDAC',
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
  /** Feilmeldinger. Samme røde som «Forfalt». */
  danger: '#A3271A',
  /** Mørk bakgrunn bak modaler. */
  backdrop: 'rgba(43,33,24,0.4)',
} as const;

/** Myk skygge under kort (0 2 10 rgba(43,33,24,0.07)). elevation er Android. */
export const shadow: ViewStyle = {
  shadowColor: '#2B2118',
  shadowOpacity: 0.07,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export const radius = {
  section: 24,
  card: 20,
  row: 16,
  button: 22,
  chip: 12,
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
} as const;

/** Minste trykkflate (bredde og høyde). */
export const minTouch = 44;

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
  sectionTitle: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26 },
  personName: { fontFamily: fonts.heading, fontSize: 19, lineHeight: 24 },
  jobAmount: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28 },
  date: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  jobTitle: { fontFamily: fonts.extrabold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  metaStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17 },
  tab: { fontFamily: fonts.bold, fontSize: 12 },
  tabSelected: { fontFamily: fonts.extrabold, fontSize: 12 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/**
 * Farge per person, styrt av avatarnøkkelen.
 * tint = seksjonsbakgrunn, ink = overskrift på tint, ring = ring rundt avatar og avkrysset sjekkboks.
 */
export type PersonColor = { tint: string; ink: string; ring: string };

export const personColors: Record<string, PersonColor> = {
  bear: { tint: '#F6E9DA', ink: '#5A3A1E', ring: '#B07D52' },
  cat: { tint: '#FCE3EA', ink: '#7A2E45', ring: '#D2557A' },
  fox: { tint: '#FFE9D6', ink: '#7A3410', ring: '#E36B2C' },
  frog: { tint: '#E6F4DD', ink: '#2F5E28', ring: '#58A84C' },
  rabbit: { tint: '#E9EDFB', ink: '#2E3A6E', ring: '#7C86C2' },
  owl: { tint: '#EFE9F8', ink: '#4B3A6E', ring: '#9A7752' },
  panda: { tint: '#EEEFF2', ink: '#2F3338', ring: '#4A4F57' },
  lion: { tint: '#FFF0CC', ink: '#6B4A00', ring: '#D99A1E' },
  dog: { tint: '#E4EEF6', ink: '#24435E', ring: '#5B8DB8' },
  unicorn: { tint: '#FBE6F6', ink: '#6A2C5E', ring: '#C064A8' },
};

/** «Felles»-seksjonen, og reserve for ukjente avatarnøkler. */
export const sharedColors: PersonColor = { tint: '#F4EFE6', ink: '#5C4A2A', ring: colors.primary };

export function personColor(avatarKey: string | null | undefined): PersonColor {
  return (avatarKey && personColors[avatarKey]) || sharedColors;
}
