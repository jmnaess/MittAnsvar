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

// Fremdriften lagres av onboardingProgress.ts. Her er bare tolkningen, så den kan testes.
export type OnboardingProgress = { householdId: string; step: OnboardingStep };

const STEPS: readonly OnboardingStep[] = ['household', 'children', 'routines', 'home'];

/** Lagret verdi → fremdrift. Alt som ikke ser riktig ut (eldre format, søppel), gir null. */
export function parseOnboardingProgress(raw: string | null): OnboardingProgress | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value?.householdId !== 'string' || !STEPS.includes(value.step)) return null;
    return { householdId: value.householdId, step: value.step };
  } catch {
    return null;
  }
}

/**
 * Steget oppstarten skal fortsette på, eller null hvis den ikke skal fortsette: ingen fremdrift,
 * ingen husstand, eller fremdriften gjelder en annen husstand. Et steg som ikke finnes for typen
 * (barn etter bytte til par), gir første steg etter husstanden.
 */
export function resumeStep(
  progress: OnboardingProgress | null,
  household: { id: string; type: HouseholdType } | null | undefined,
): OnboardingStep | null {
  if (!progress || !household || progress.householdId !== household.id) return null;
  const steps = onboardingSteps(household.type);
  return steps.includes(progress.step) ? progress.step : steps[1];
}
