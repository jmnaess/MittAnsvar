import type { CreateHouseholdInput } from '../api';
import {
  householdEditChanges,
  nextStep,
  onboardingSteps,
  parseOnboardingProgress,
  prevStep,
  resumeStep,
} from '../onboardingSteps';

describe('stegene i oppstarten', () => {
  it('familie har barnesteg, par og enslig ikke', () => {
    expect(onboardingSteps('family')).toEqual(['household', 'children', 'routines', 'home']);
    expect(onboardingSteps('couple')).toEqual(['household', 'routines', 'home']);
    expect(onboardingSteps('single')).toEqual(['household', 'routines', 'home']);
  });

  it('fram og tilbake med barn', () => {
    expect(nextStep('household', 'family')).toBe('children');
    expect(nextStep('children', 'family')).toBe('routines');
    expect(nextStep('home', 'family')).toBeNull();
    expect(prevStep('routines', 'family')).toBe('children');
    expect(prevStep('children', 'family')).toBe('household');
    expect(prevStep('household', 'family')).toBeNull();
  });

  it('uten barn hoppes barnesteget over begge veier', () => {
    expect(nextStep('household', 'couple')).toBe('routines');
    expect(prevStep('routines', 'single')).toBe('household');
  });

  it('et steg som ikke finnes for typen, går tilbake til husstand', () => {
    expect(prevStep('children', 'couple')).toBe('household');
  });
});

describe('householdEditChanges', () => {
  const saved: CreateHouseholdInput = {
    name: 'Familien Hansen',
    type: 'family',
    housingType: 'house',
    displayName: 'Kari',
    avatar: 'fox',
  };

  it('ingenting endret gir ingen endringer', () => {
    expect(householdEditChanges(saved, { ...saved })).toEqual({ household: {} });
  });

  it('bare det som er endret, med databasens kolonnenavn', () => {
    expect(
      householdEditChanges(saved, { ...saved, name: 'Hansen', housingType: 'apartment', avatar: 'cat' }),
    ).toEqual({ household: { name: 'Hansen', housing_type: 'apartment' }, avatar: 'cat' });
  });

  it('type og eget navn', () => {
    expect(householdEditChanges(saved, { ...saved, type: 'couple', displayName: 'Kari Anne' })).toEqual({
      household: { type: 'couple' },
      displayName: 'Kari Anne',
    });
  });
});

describe('gjenoppta oppstarten', () => {
  const family = { id: 'h1', type: 'family' as const };

  it('leser lagret fremdrift og avviser søppel', () => {
    expect(parseOnboardingProgress('{"householdId":"h1","step":"routines"}')).toEqual({
      householdId: 'h1',
      step: 'routines',
    });
    expect(parseOnboardingProgress(null)).toBeNull();
    expect(parseOnboardingProgress('ikke json')).toBeNull();
    expect(parseOnboardingProgress('{"householdId":"h1","step":"ukjent"}')).toBeNull();
    expect(parseOnboardingProgress('{"step":"home"}')).toBeNull();
  });

  it('fortsetter på lagret steg for samme husstand', () => {
    expect(resumeStep({ householdId: 'h1', step: 'children' }, family)).toBe('children');
    expect(resumeStep({ householdId: 'h1', step: 'routines' }, family)).toBe('routines');
    expect(resumeStep({ householdId: 'h1', step: 'home' }, family)).toBe('home');
    expect(resumeStep({ householdId: 'h1', step: 'household' }, family)).toBe('household');
  });

  it('ingen fremdrift, ingen husstand eller en annen husstand: ikke gjenoppta', () => {
    expect(resumeStep(null, family)).toBeNull();
    expect(resumeStep({ householdId: 'h1', step: 'home' }, null)).toBeNull();
    expect(resumeStep({ householdId: 'h2', step: 'home' }, family)).toBeNull();
  });

  it('barnesteget etter bytte til par gir første steg etter husstand', () => {
    expect(resumeStep({ householdId: 'h1', step: 'children' }, { id: 'h1', type: 'couple' })).toBe('routines');
  });
});
