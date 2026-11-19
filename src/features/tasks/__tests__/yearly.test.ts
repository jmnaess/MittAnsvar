import { toYearlyInputs } from '../yearly';

const values = { title: ' Vaske vinduer ', assigneeId: null, reward: '', months: [9, 4], category: 'maintenance' as const };

describe('toYearlyInputs', () => {
  it('lager én årlig månedsoppgave per måned, sortert', () => {
    const inputs = toYearlyInputs(values)!;
    expect(inputs.map((i) => i.month)).toEqual([4, 9]);
    expect(inputs[0]).toMatchObject({
      title: 'Vaske vinduer',
      category: 'maintenance',
      recurrence_type: 'calendar',
      recurrence_unit: 'year',
      recurrence_every: 1,
      month_day: null,
      assigned_member_id: null,
      reward_nok: null,
    });
  });

  it('tar med ansvarlig og lønn på alle', () => {
    const inputs = toYearlyInputs({ ...values, assigneeId: 'leah', reward: '20' })!;
    expect(inputs.every((i) => i.assigned_member_id === 'leah' && i.reward_nok === 20)).toBe(true);
  });

  it('er ugyldig uten tittel, uten måned eller med ugyldig lønn', () => {
    expect(toYearlyInputs({ ...values, title: '  ' })).toBeNull();
    expect(toYearlyInputs({ ...values, months: [] })).toBeNull();
    expect(toYearlyInputs({ ...values, reward: '0' })).toBeNull();
  });

  it('lager bare én oppgave per måned, selv om samme måned kommer to ganger', () => {
    expect(toYearlyInputs({ ...values, months: [4, 4] })!.length).toBe(1);
  });
});
