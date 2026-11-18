import type { Json } from '../../types/database';
import { HOME_PROFILE_FLAGS, type HomeProfile, type HomeProfileFlag } from '../household/types';

/**
 * Oppfyller hjemprofilen malens betingelser (task_templates.requires)?
 *   null:                         ingen betingelse → ja
 *   {"has_car": true}:            svaret må være nøyaktig true (ubesvart = null = nei)
 *   {"sewage_type": ["septic_tank", ...]}: svaret må være ett av dem
 * Alle nøkler må stemme. Databasen avviser ukjente nøkler (private.template_requires_valid);
 * skulle en likevel dukke opp (eldre app, nyere database), regnes den som ikke oppfylt.
 */
export function meetsRequires(requires: Json | null, profile: HomeProfile): boolean {
  if (requires === null) return true;
  if (typeof requires !== 'object' || Array.isArray(requires)) return false;

  return Object.entries(requires).every(([key, wanted]) => {
    if (isFlag(key)) return profile[key] !== null && profile[key] === wanted;
    if (key === 'sewage_type') {
      return Array.isArray(wanted) && profile.sewage_type !== null && wanted.includes(profile.sewage_type);
    }
    return false;
  });
}

function isFlag(key: string): key is HomeProfileFlag {
  return (HOME_PROFILE_FLAGS as readonly string[]).includes(key);
}
