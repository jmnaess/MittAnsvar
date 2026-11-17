// Innebygde avatarer. Nøkkelen lagres i members.avatar, aldri et bilde.
// Foreløpig emoji; kan byttes til illustrasjoner uten å endre data.
// label leses opp av skjermleser.
export const AVATARS = {
  fox: { emoji: '🦊', label: 'Rev' },
  cat: { emoji: '🐱', label: 'Katt' },
  owl: { emoji: '🦉', label: 'Ugle' },
  bear: { emoji: '🐻', label: 'Bjørn' },
  frog: { emoji: '🐸', label: 'Frosk' },
  rabbit: { emoji: '🐰', label: 'Kanin' },
  panda: { emoji: '🐼', label: 'Panda' },
  lion: { emoji: '🦁', label: 'Løve' },
  dog: { emoji: '🐶', label: 'Hund' },
  unicorn: { emoji: '🦄', label: 'Enhjørning' },
} as const;

export type AvatarKey = keyof typeof AVATARS;

export const AVATAR_KEYS = Object.keys(AVATARS) as AvatarKey[];

/** Ukjente nøkler (f.eks. fra en nyere appversjon) vises som et nøytralt fjes. */
export function avatarEmoji(key: string): string {
  return AVATARS[key as AvatarKey]?.emoji ?? '🙂';
}

export function avatarLabel(key: string): string {
  return AVATARS[key as AvatarKey]?.label ?? 'Avatar';
}
