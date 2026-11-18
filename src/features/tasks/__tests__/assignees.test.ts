import type { Member } from '../../household/types';
import {
  allAdults,
  initialAssignees,
  newTaskForLabel,
  nextAssignees,
  SHARED,
  toTaskInputs,
} from '../assignees';

const member = (id: string, role: 'adult' | 'child') => ({ id, role }) as Member;
const members = [member('mor', 'adult'), member('far', 'adult'), member('leah', 'child'), member('ola', 'child')];

describe('nextAssignees', () => {
  it('Felles fjerner de andre', () => {
    expect(nextAssignees(['leah', 'ola'], ['leah', 'ola', SHARED])).toEqual([SHARED]);
  });

  it('en person fjerner Felles', () => {
    expect(nextAssignees([SHARED], [SHARED, 'leah'])).toEqual(['leah']);
  });

  it('flere personer kan velges', () => {
    expect(nextAssignees(['leah'], ['leah', 'ola'])).toEqual(['leah', 'ola']);
  });

  it('tomt utvalg blir Felles', () => {
    expect(nextAssignees(['leah'], [])).toEqual([SHARED]);
    expect(nextAssignees([SHARED], [])).toEqual([SHARED]);
  });
});

describe('allAdults', () => {
  it('lønn skjules bare når alle valgte er voksne', () => {
    expect(allAdults(['mor', 'far'], members)).toBe(true);
    expect(allAdults(['mor', 'leah'], members)).toBe(false);
    expect(allAdults([SHARED], members)).toBe(false);
  });
});

describe('toTaskInputs', () => {
  const base = {
    title: 'Rydde rommet',
    job_member_ids: [],
    reward_nok: 10,
    recurrence_type: 'once' as const,
    recurrence_unit: null,
    recurrence_every: null,
    weekdays: null,
    month_day: null,
    month: null,
    job_repeats: false,
    once_on: '2026-11-18',
    season_start_month: null,
    season_end_month: null,
  };

  it('én oppgave per person, med samme tittel, dato og lønn', () => {
    const inputs = toTaskInputs(base, ['leah', 'ola'], members);
    expect(inputs.map((i) => i.assigned_member_id)).toEqual(['leah', 'ola']);
    expect(inputs.every((i) => i.title === 'Rydde rommet' && i.once_on === '2026-11-18' && i.reward_nok === 10))
      .toBe(true);
  });

  it('voksne får ikke lønn', () => {
    const inputs = toTaskInputs(base, ['mor', 'leah'], members);
    expect(inputs.map((i) => [i.assigned_member_id, i.reward_nok])).toEqual([['mor', null], ['leah', 10]]);
  });

  it('Felles gir én oppgave uten ansvarlig', () => {
    expect(toTaskInputs(base, [SHARED], members)).toEqual([{ ...base, assigned_member_id: null }]);
  });
});

describe('newTaskForLabel', () => {
  it('bruker navnet til personen, også voksne', () => {
    expect(newTaskForLabel('Leah')).toBe('+ Ny oppgave til Leah');
    expect(newTaskForLabel('John M.')).toBe('+ Ny oppgave til John M.');
  });
});

describe('initialAssignees', () => {
  it('forhåndsvelger personen fra personvisningen', () => {
    expect(initialAssignees('leah')).toEqual(['leah']);
  });

  it('uten person starter skjemaet på Felles', () => {
    expect(initialAssignees(undefined)).toEqual([SHARED]);
    expect(initialAssignees('')).toEqual([SHARED]);
  });

  it('tar den første når ruteparameteren er en liste', () => {
    expect(initialAssignees(['leah', 'ola'])).toEqual(['leah']);
  });
});
