// Stegene når man oppretter en husstand: husstand → barn (bare familie) → hverdagen → hjemmet.
// Ren logikk, så den kan testes uten React Native. Brukes av app/(app)/onboarding.tsx.
import type { CreateHouseholdInput, HouseholdChanges } from './api';
import type { HouseholdType } from './types';

export type OnboardingStep = 'household' | 'children' | 'routines' | 'home';

/** Stegene for typen. Barnesteget finnes bare for «Familie med barn». */
export function onboardingSteps(type: HouseholdType): OnboardingStep[] {
  return type === 'family'
    ? ['household', 'children', 'routines', 'home']
    : ['household', 'routines', 'home'];
}

/** Neste steg, eller null etter det siste. */
export function nextStep(step: OnboardingStep, type: HouseholdType): OnboardingStep | null {
  const steps = onboardingSteps(type);
  return steps[steps.indexOf(step) + 1] ?? null;
}

/** Forrige steg, eller null på det første. Et steg som ikke finnes for typen, går til husstand. */
export function prevStep(step: OnboardingStep, type: HouseholdType): OnboardingStep | null {
  const steps = onboardingSteps(type);
  const i = steps.indexOf(step);
  if (i === -1) return 'household';
  return i === 0 ? null : steps[i - 1];
}

/**
 * Det som er endret når man går tilbake til første steg og lagrer på nytt. Husstanden oppdateres
 * (aldri opprettes på nytt), og navn og figur på din egen profil bare hvis de er endret.
 */
export function householdEditChanges(
  saved: CreateHouseholdInput,
  edited: CreateHouseholdInput,
): { household: HouseholdChanges; displayName?: string; avatar?: string } {
  const household: HouseholdChanges = {};
  if (edited.name !== saved.name) household.name = edited.name;
  if (edited.type !== saved.type) household.type = edited.type;
  if (edited.housingType !== saved.housingType) household.housing_type = edited.housingType;
  return {
    household,
    ...(edited.displayName !== saved.displayName ? { displayName: edited.displayName } : {}),
    ...(edited.avatar !== saved.avatar ? { avatar: edited.avatar } : {}),
  };
}
