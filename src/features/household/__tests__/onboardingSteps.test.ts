import type { CreateHouseholdInput } from '../api';
import { householdEditChanges, nextStep, onboardingSteps, prevStep } from '../onboardingSteps';

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
