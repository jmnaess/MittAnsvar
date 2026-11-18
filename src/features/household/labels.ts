import type { FeedbackTone, HomeProfileFlag, HouseholdType, HousingType, SewageType } from './types';

// Norske etiketter for enum-verdiene i databasen.
export const HOUSEHOLD_TYPE_OPTIONS: { value: HouseholdType; label: string }[] = [
  { value: 'single', label: 'Enslig' },
  { value: 'couple', label: 'Par' },
  { value: 'family', label: 'Familie med barn' },
];

export const HOUSING_TYPE_OPTIONS: { value: HousingType; label: string }[] = [
  { value: 'apartment', label: 'Leilighet' },
  { value: 'townhouse', label: 'Rekkehus/tomannsbolig' },
  { value: 'house', label: 'Enebolig' },
];

/** Ja/nei-spørsmålene i hjemprofilen, i den rekkefølgen de vises. */
export const HOME_PROFILE_QUESTIONS: { key: HomeProfileFlag; label: string }[] = [
  { key: 'has_garden', label: 'Har dere hage eller plen?' },
  { key: 'has_car', label: 'Har dere bil?' },
  { key: 'has_cabin', label: 'Har dere hytte?' },
  { key: 'has_air_heat_pump', label: 'Har dere luft-til-luft-varmepumpe?' },
  { key: 'has_fireplace', label: 'Har dere peis eller vedovn?' },
  { key: 'has_balanced_ventilation', label: 'Har dere balansert ventilasjon?' },
  { key: 'has_hydronic_heating', label: 'Har dere vannbåren varme?' },
  { key: 'has_private_well', label: 'Har dere egen brønn?' },
];

export const SEWAGE_TYPE_OPTIONS: { value: SewageType; label: string }[] = [
  { value: 'municipal', label: 'Kommunalt' },
  { value: 'septic_tank', label: 'Septiktank' },
  { value: 'mini_treatment_plant', label: 'Minirenseanlegg' },
];

export const FEEDBACK_TONE_OPTIONS: { value: FeedbackTone; label: string }[] = [
  { value: 'fact', label: 'Fakta' },
  { value: 'humor', label: 'Humor' },
  { value: 'both', label: 'Begge' },
];
