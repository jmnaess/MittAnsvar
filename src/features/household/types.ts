import type { Database } from '../../types/database';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type Household = Tables['households']['Row'];
export type Member = Tables['members']['Row'];

/** Det appen trenger om en aktiv invitasjon. Koden kan ikke hentes igjen. */
export type Invite = Pick<Tables['invites']['Row'], 'id' | 'created_by' | 'expires_at'>;

export type HouseholdType = Enums['household_type'];
export type HousingType = Enums['housing_type'];
export type FeedbackTone = Enums['feedback_tone'];
export type SewageType = Enums['sewage_type'];
/** figure = den tegnede avataren, photo = profilbildet (hvis det finnes). */
export type AvatarMode = Enums['avatar_mode'];

/** Ja/nei-spørsmålene i hjemprofilen. null = ikke svart. */
export const HOME_PROFILE_FLAGS = [
  'has_garden',
  'has_car',
  'has_cabin',
  'has_air_heat_pump',
  'has_fireplace',
  'has_balanced_ventilation',
  'has_hydronic_heating',
  'has_private_well',
] as const;
export type HomeProfileFlag = (typeof HOME_PROFILE_FLAGS)[number];

/** Hjemprofilen: boligtype, ja/nei-spørsmålene og avløp. Kolonner på households. */
export type HomeProfile = Pick<Household, 'housing_type' | HomeProfileFlag | 'sewage_type'>;

/** Det brukeren fyller ut for et barn. birth_year er valgfritt (null). */
export type ChildInput = {
  display_name: string;
  avatar: string;
  birth_year: number | null;
};
