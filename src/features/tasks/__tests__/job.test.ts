import type { Member } from '../../household/types';
import { describeJobMembers, jobMembers, toJobInput } from '../job';

const values = { title: 'Henge opp vask', memberIds: [], reward: '15', repeats: false };

function member(id: string, name: string, role: 'adult' | 'child' = 'child'): Member {
  return {
    id,
    role,
    household_id: 'h',
    display_name: name,
    avatar: 'fox',
    birth_year: null,
    auth_user_id: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

const adult = member('voksen', 'Voksen', 'adult');
const leah = member('leah', 'Leah');
const ola = member('ola', 'Ola');
const emma = member('emma', 'Emma');
const members = [adult, leah, ola, emma];

describe('toJobInput', () => {
  it('lager en ledig jobb uten dato', () => {
    expect(toJobInput(values)).toEqual({
      title: 'Henge opp vask',
      assigned_member_id: null,
      job_member_ids: [],
      reward_nok: 15,
      recurrence_type: 'job',
      recurrence_unit: null,
      recurrence_every: null,
      weekdays: null,
      month_day: null,
      month: null,
      job_repeats: false,
      once_on: null,
      season_start_month: null,
      season_end_month: null,
    });
  });

  it('tar med barna og «kan gjøres flere ganger», aldri én ansvarlig', () => {
    const input = toJobInput({ ...values, memberIds: ['leah', 'ola'], repeats: true });
    expect(input?.job_member_ids).toEqual(['leah', 'ola']);
    expect(input?.assigned_member_id).toBeNull();
    expect(input?.job_repeats).toBe(true);
  });

  it('tom lønn = ingen lønn', () => {
    expect(toJobInput({ ...values, reward: '' })?.reward_nok).toBeNull();
  });

  it('trimmer tittelen', () => {
    expect(toJobInput({ ...values, title: '  Rydde bod  ' })?.title).toBe('Rydde bod');
  });

  it('er ugyldig uten tittel eller med ugyldig lønn', () => {
    expect(toJobInput({ ...values, title: '   ' })).toBeNull();
    expect(toJobInput({ ...values, reward: '0' })).toBeNull();
    expect(toJobInput({ ...values, reward: '10001' })).toBeNull();
  });
});

describe('jobMembers', () => {
  it('tom liste = alle barna, uten voksne', () => {
    expect(jobMembers([], members)).toEqual([leah, ola, emma]);
  });

  it('utvalgte barn i samme rekkefølge som medlemslisten', () => {
    expect(jobMembers(['emma', 'leah'], members)).toEqual([leah, emma]);
  });

  it('bare ukjente id-er = alle barna', () => {
    expect(jobMembers(['borte'], members)).toEqual([leah, ola, emma]);
  });
});

describe('describeJobMembers', () => {
  it('«Alle barna» for tom liste', () => {
    expect(describeJobMembers([], members)).toBe('Alle barna');
  });

  it('ett, to og tre barn', () => {
    expect(describeJobMembers(['ola'], members)).toBe('Ola');
    expect(describeJobMembers(['ola', 'leah'], members)).toBe('Leah og Ola');
    expect(describeJobMembers(['emma', 'ola', 'leah'], members)).toBe('Leah, Ola og Emma');
  });
});
