/**
 * Hvem som venter på godkjenning, til banneret i «I dag».
 * «Leah venter», «Leah og Jesper venter», «Leah, Jesper og Iver venter»,
 * og ved flere enn tre: «Leah, Jesper og 2 til venter».
 */
export function waitingText(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} venter`;
  if (names.length <= 3) {
    return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]} venter`;
  }
  return `${names[0]}, ${names[1]} og ${names.length - 2} til venter`;
}
