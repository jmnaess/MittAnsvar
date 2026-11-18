import {
  emptyHomeProfile,
  hasAnyAnswer,
  homeProfileChanges,
  pickHomeProfile,
  suggestionBaseline,
} from '../homeProfile';
import type { Household } from '../types';

const empty = emptyHomeProfile('house');

describe('emptyHomeProfile', () => {
  it('har boligtype og ellers bare ubesvarte spørsmål', () => {
    expect(empty).toEqual({
      housing_type: 'house',
      has_garden: null,
      has_car: null,
      has_cabin: null,
      has_air_heat_pump: null,
      has_fireplace: null,
      has_balanced_ventilation: null,
      has_hydronic_heating: null,
      has_private_well: null,
      sewage_type: null,
    });
  });
});

describe('pickHomeProfile', () => {
  it('tar bare med profilkolonnene', () => {
    const household = { id: 'h', name: 'A', type: 'family', ...empty, has_car: true } as Household;
    expect(pickHomeProfile(household)).toEqual({ ...empty, has_car: true });
  });
});

describe('hasAnyAnswer og suggestionBaseline', () => {
  it('boligtype alene teller ikke som svar', () => {
    expect(hasAnyAnswer(empty)).toBe(false);
    expect(suggestionBaseline(empty)).toBeNull();
  });

  it('«nei» og avløp teller som svar', () => {
    expect(hasAnyAnswer({ ...empty, has_car: false })).toBe(true);
    expect(hasAnyAnswer({ ...empty, sewage_type: 'municipal' })).toBe(true);
    const answered = { ...empty, has_garden: true };
    expect(suggestionBaseline(answered)).toBe(answered);
  });
});

describe('homeProfileChanges', () => {
  it('gir bare det som er endret', () => {
    expect(homeProfileChanges(empty, { ...empty, has_car: true, sewage_type: 'septic_tank' }))
      .toEqual({ has_car: true, sewage_type: 'septic_tank' });
  });

  it('svar som fjernes, blir null', () => {
    expect(homeProfileChanges({ ...empty, has_car: true }, empty)).toEqual({ has_car: null });
  });

  it('ingen endring gir tomt objekt', () => {
    expect(homeProfileChanges(empty, { ...empty })).toEqual({});
  });
});
