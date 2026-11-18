// Innebygde avatarer. Nøkkelen lagres i members.avatar, aldri et bilde.
// Tegningene ligger i src/ui/avatarArt.tsx og fargene per person i src/ui/theme.ts
// (lightPersonColors og darkPersonColors).
// label leses opp av skjermleser.
export const AVATARS = {
  fox: { label: 'Rev' },
  cat: { label: 'Katt' },
  owl: { label: 'Ugle' },
  bear: { label: 'Bjørn' },
  frog: { label: 'Frosk' },
  rabbit: { label: 'Kanin' },
  panda: { label: 'Panda' },
  lion: { label: 'Løve' },
  dog: { label: 'Hund' },
  unicorn: { label: 'Enhjørning' },
} as const;

export type AvatarKey = keyof typeof AVATARS;

export const AVATAR_KEYS = Object.keys(AVATARS) as AvatarKey[];

export function avatarLabel(key: string): string {
  return AVATARS[key as AvatarKey]?.label ?? 'Avatar';
}
