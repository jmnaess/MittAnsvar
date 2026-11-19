/** Hvor mange avatarer AvatarStack viser, og hvor mange som telles i «+N». */
export function avatarStackLayout(count: number, max: number): { shown: number; extra: number } {
  const shown = Math.min(count, max);
  return { shown, extra: count - shown };
}
