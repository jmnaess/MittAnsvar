import { spacing } from '../../ui/theme';

/** Smaleste kort som fortsatt gir plass til store rader. */
export const MIN_CARD_WIDTH = 300;
export const MAX_COLUMNS = 4;

/** Antall kolonner for vindusbredden. Følger vinduet, så delt skjerm på iPad også virker. */
export function boardColumnCount(windowWidth: number): number {
  const available = windowWidth - 2 * spacing.page + spacing.section;
  const columns = Math.floor(available / (MIN_CARD_WIDTH + spacing.section));
  return Math.min(MAX_COLUMNS, Math.max(1, columns));
}

/**
 * Fordeler kortene på kolonner etter rekkefølge. Ikke etter høyde: da ville kort hoppet til en
 * annen kolonne mens noen krysser av.
 */
export function distributeCards<T>(cards: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  cards.forEach((card, index) => columns[index % columnCount].push(card));
  return columns;
}
