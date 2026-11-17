import type { FeedbackTone, HouseholdType, HousingType } from './types';

// Norske etiketter for enum-verdiene i databasen.
export const HOUSEHOLD_TYPE_OPTIONS: { value: HouseholdType; label: string }[] = [
  { value: 'single', label: 'Enslig' },
  { value: 'couple', label: 'Par' },
  { value: 'family', label: 'Familie med barn' },
];

export const HOUSING_TYPE_OPTIONS: { value: HousingType; label: string }[] = [
  { value: 'apartment', label: 'Leilighet' },
  { value: 'townhouse', label: 'Rekkehus' },
  { value: 'house', label: 'Enebolig' },
];

export const FEEDBACK_TONE_OPTIONS: { value: FeedbackTone; label: string }[] = [
  { value: 'fact', label: 'Fakta' },
  { value: 'humor', label: 'Humor' },
  { value: 'both', label: 'Begge' },
];
