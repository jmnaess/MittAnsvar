import { HOME_PROFILE_FLAGS, type HomeProfile, type HousingType } from './types';

/** Hjemprofilen fra en husstand (bare kolonnene profilen består av). */
export function pickHomeProfile(household: HomeProfile): HomeProfile {
  const profile = { housing_type: household.housing_type, sewage_type: household.sewage_type } as HomeProfile;
  for (const key of HOME_PROFILE_FLAGS) profile[key] = household[key];
  return profile;
}

/** Ny profil i oppstarten: boligtypen er valgt, resten er ubesvart. */
export function emptyHomeProfile(housingType: HousingType): HomeProfile {
  const profile = { housing_type: housingType, sewage_type: null } as HomeProfile;
  for (const key of HOME_PROFILE_FLAGS) profile[key] = null;
  return profile;
}

/** Har husstanden svart på minst ett spørsmål (boligtype teller ikke, den er alltid satt)? */
export function hasAnyAnswer(profile: HomeProfile): boolean {
  return profile.sewage_type !== null || HOME_PROFILE_FLAGS.some((key) => profile[key] !== null);
}

/**
 * Profilen forslagene skal sammenlignes med (before i suggestAfterProfileChange).
 * Uten noen svar regnes det som første gang, også i Innstillinger hvis oppstarten ble hoppet over:
 * da foreslås alle maler som passer, også de uten betingelse.
 */
export function suggestionBaseline<T extends HomeProfile>(saved: T): T | null {
  return hasAnyAnswer(saved) ? saved : null;
}

/** Bare kolonnene som er endret, så lagringen ikke skriver over noe annet. */
export function homeProfileChanges(saved: HomeProfile, edited: HomeProfile): Partial<HomeProfile> {
  const changes: Partial<Record<keyof HomeProfile, unknown>> = {};
  for (const key of Object.keys(edited) as (keyof HomeProfile)[]) {
    if (edited[key] !== saved[key]) changes[key] = edited[key];
  }
  return changes as Partial<HomeProfile>;
}
