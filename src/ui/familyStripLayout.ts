// Størrelser og navn i FamilyStrip («I dag»). Ren utregning, så den kan testes uten React Native.

/** Største ring (ytterkant). Avataren er 12 px mindre: 3 px luft + 3 px ring på hver side. */
export const RING_MAX = 56;
export const RING_EXTRA = 12;
/** Så mange får plass på én rad. Flere enn dette: raden kan sveipes. */
export const MAX_ON_ONE_ROW = 6;
/** Ringen når raden kan sveipes. */
export const SCROLL_RING = 44;

/** Minste luft mellom to ringer. */
const MIN_GAP = 8;
/** Bredeste plass per person, så to–tre personer ikke spres utover hele skjermen. */
const MAX_CELL = 72;
/** Plass per person når raden kan sveipes: bredere enn ringen, så «John M.» får plass. */
const SCROLL_CELL = 64;

export type FamilyStripLayout = {
  /** Ringens ytre diameter. */
  ring: number;
  /** Bredden hver person får (ring + navn). */
  cellWidth: number;
  /** Sju eller flere: raden kan sveipes og falmer mot høyre. */
  scrolls: boolean;
};

/**
 * Opptil seks personer deler bredden, med ring på maks RING_MAX. Sju eller flere får fast
 * størrelse og en sveipbar rad. width = bredden innenfor sidepaddingen.
 */
export function familyStripLayout(count: number, width: number): FamilyStripLayout {
  if (count > MAX_ON_ONE_ROW) return { ring: SCROLL_RING, cellWidth: SCROLL_CELL, scrolls: true };
  const cell = Math.min(MAX_CELL, width / Math.max(1, count));
  const ring = Math.min(RING_MAX, Math.floor(cell - MIN_GAP));
  return { ring, cellWidth: cell, scrolls: false };
}

/** «Leah» → «Leah», «John Martin» → «John M.», «Ola Nordmann Hansen» → «Ola N.». */
export function shortName(name: string): string {
  const [first = '', second] = name.trim().split(/\s+/);
  return second ? `${first} ${second[0].toLocaleUpperCase('nb')}.` : first;
}
