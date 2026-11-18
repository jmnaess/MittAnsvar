import type { Scheme } from './theme';

/** «Utseende» under Innstillinger. Lagres per enhet, ikke per bruker, så det gjelder også barnets enhet. */
export type AppearancePreference = 'system' | 'light' | 'dark';

/** Nøkkelen i secureStorage. */
export const APPEARANCE_STORAGE_KEY = 'appearance';

/** Lagret verdi → valg. Alt ukjent (eller ingenting) betyr «følg telefonen». */
export function parsePreference(raw: string | null): AppearancePreference {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

/** Hvilket tema som vises: eget valg vinner, ellers telefonens innstilling, ellers lyst. */
export function resolveScheme(preference: AppearancePreference, system: string | null | undefined): Scheme {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
