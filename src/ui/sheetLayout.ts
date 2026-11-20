// Plassen et Sheet får, også når tastaturet er oppe. Ren utregning, så den kan testes uten React Native.

/** Arket bruker høyst så mye av skjermhøyden, så bakgrunnen alltid synes rundt. */
export const SHEET_MAX_SHARE = 0.85;

export type SheetFrameInput = {
  /** Høyden på bakgrunnen (hele modalen), målt med onLayout. 0 = ikke målt ennå. */
  height: number;
  /**
   * Toppen av tastaturet, i samme koordinater (endCoordinates.screenY). null = tastaturet er nede.
   * Har Android allerede gjort vinduet mindre, er toppen omtrent lik høyden, og arket flyttes ikke.
   */
  keyboardTop: number | null;
  insetTop: number;
  insetBottom: number;
  /** Luft rundt arket (spacing.page). */
  padding: number;
};

export type SheetFrame = { paddingTop: number; paddingBottom: number; maxHeight: number | undefined };

/** Så mye tastaturet dekker av bakgrunnen nederst. */
export function keyboardOverlap(height: number, keyboardTop: number | null): number {
  return keyboardTop === null || height === 0 ? 0 : Math.max(0, height - keyboardTop);
}

/**
 * Luft over og under arket og høyeste høyde. Med tastaturet oppe står arket over det, og
 * maxHeight krymper så det aldri går under tastaturet eller opp i statuslinjen.
 * Før bakgrunnen er målt: ingen maxHeight (Sheet bruker SHEET_MAX_SHARE i prosent).
 */
export function sheetFrame({ height, keyboardTop, insetTop, insetBottom, padding }: SheetFrameInput): SheetFrame {
  const overlap = keyboardOverlap(height, keyboardTop);
  const paddingTop = padding + insetTop;
  const paddingBottom = padding + (overlap > 0 ? overlap : insetBottom);
  if (height === 0) return { paddingTop, paddingBottom, maxHeight: undefined };
  const available = Math.max(0, height - paddingTop - paddingBottom);
  return { paddingTop, paddingBottom, maxHeight: Math.min(height * SHEET_MAX_SHARE, available) };
}
