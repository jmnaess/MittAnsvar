import type { Database } from '../../types/database';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type Household = Tables['households']['Row'];
export type Member = Tables['members']['Row'];

export type HouseholdType = Enums['household_type'];
export type HousingType = Enums['housing_type'];
export type FeedbackTone = Enums['feedback_tone'];

/** Det brukeren fyller ut for et barn. birth_year er valgfritt (null). */
export type ChildInput = {
  display_name: string;
  avatar: string;
  birth_year: number | null;
};
