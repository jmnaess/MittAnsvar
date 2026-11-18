/** Hvor mange jobbkort i bredden: 1 = full bredde, 2 eller 3 = side om side, 4+ = tre i bredden. */
export function jobColumns(count: number): number {
  return Math.max(1, Math.min(count, 3));
}
