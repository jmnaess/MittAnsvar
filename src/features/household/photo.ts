// Profilbilder: ren logikk uten Supabase, så den kan testes med Jest.
// Bildene ligger i den private bøtta member-photos, sti {household_id}/{member_id}/{uuid}.jpg.
// Se supabase/migrations/*_member_photos.sql og docs/DATABASE.md §6.

import type { AvatarMode, Member } from './types';

export const PHOTO_BUCKET = 'member-photos';

/** Hvor lenge en signert URL varer (sekunder). Appen henter nye før de går ut. */
export const PHOTO_URL_TTL_SECONDS = 60 * 60;

/** Bildet som Avatar viser. cacheKey er stien: samme fil gir samme cache, selv med ny URL. */
export type AvatarPhoto = { uri: string; cacheKey: string };

/** Valgene «Figur» og «Bilde» (voksen i «Profilbilde», barnet i «Innstillinger»). */
export const AVATAR_MODE_OPTIONS: { value: AvatarMode; label: string }[] = [
  { value: 'figure', label: 'Figur' },
  { value: 'photo', label: 'Bilde' },
];

/** Bredde og høyde på bildet som lastes opp. */
export const PHOTO_SIZE = 512;

/**
 * Kvadratet midt i bildet. Velgeren beskjærer allerede kvadratisk, men på noen enheter blir
 * det et par piksler skjevt, og da hadde nedskaleringen strukket bildet.
 */
export function centerSquare(width: number, height: number) {
  const size = Math.min(width, height);
  return {
    originX: Math.floor((width - size) / 2),
    originY: Math.floor((height - size) / 2),
    width: size,
    height: size,
  };
}

/** Mappen til ett medlem. Alt i den slettes når medlemmet fjernes. */
export function photoFolder(householdId: string, memberId: string): string {
  return `${householdId}/${memberId}`;
}

/** Ny sti for et bilde. Nytt filnavn hver gang, så cachen aldri viser et gammelt bilde. */
export function newPhotoPath(householdId: string, memberId: string, fileId: string): string {
  return `${photoFolder(householdId, memberId)}/${fileId}.jpg`;
}

/** Stiene som trenger en signert URL: medlemmer som har bilde og har valgt å vise det. */
export function photoPathsToSign(members: Pick<Member, 'avatar_mode' | 'photo_path'>[]): string[] {
  const paths = members
    .filter((m) => m.avatar_mode === 'photo' && m.photo_path)
    .map((m) => m.photo_path!);
  return [...new Set(paths)].sort();
}

/**
 * Bildet som skal vises for et medlem, eller undefined (da vises figuren).
 * Bilde bare når medlemmet har valgt bilde, har et bilde, og vi har en URL til det.
 */
export function memberPhoto(
  member: Pick<Member, 'avatar_mode' | 'photo_path'>,
  urls: Record<string, string> | undefined,
): AvatarPhoto | undefined {
  if (member.avatar_mode !== 'photo' || !member.photo_path) return undefined;
  const uri = urls?.[member.photo_path];
  return uri ? { uri, cacheKey: member.photo_path } : undefined;
}
