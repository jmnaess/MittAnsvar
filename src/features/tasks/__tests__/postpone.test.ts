import { isPostponed, postponeChoices, weekendDate } from '../postpone';

describe('weekendDate («Til helga»)', () => {
  // Uken 16.–22. november 2026: mandag til søndag.
  it.each([
    ['mandag', '2026-11-16', '2026-11-21'],
    ['tirsdag', '2026-11-17', '2026-11-21'],
    ['onsdag', '2026-11-18', '2026-11-21'],
    ['torsdag', '2026-11-19', '2026-11-21'],
    ['fredag', '2026-11-20', '2026-11-21'],
    ['lørdag → søndag', '2026-11-21', '2026-11-22'],
    ['søndag → neste lørdag', '2026-11-22', '2026-11-28'],
  ])('%s', (_, today, expected) => {
    expect(weekendDate(today)).toBe(expected);
  });

  it('over månedsskifte', () => {
    expect(weekendDate('2026-11-30')).toBe('2026-12-05'); // mandag
  });

  it('over årsskifte', () => {
    expect(weekendDate('2026-12-31')).toBe('2027-01-02'); // torsdag
    expect(weekendDate('2027-01-03')).toBe('2027-01-09'); // søndag
  });
});

describe('postponeChoices', () => {
  it('i morgen og til helga', () => {
    expect(postponeChoices('2026-11-18')).toEqual({ tomorrow: '2026-11-19', weekend: '2026-11-21' });
  });

  it('fredag: i morgen og til helga er samme lørdag', () => {
    expect(postponeChoices('2026-11-20')).toEqual({ tomorrow: '2026-11-21', weekend: '2026-11-21' });
  });
});

describe('isPostponed', () => {
  it('utsatt når fristen er datoen den ble flyttet til', () => {
    expect(isPostponed({ next_due_on: '2026-11-21', postponed_to: '2026-11-21' })).toBe(true);
  });

  it('ikke utsatt etter avkrysning (ny frist)', () => {
    expect(isPostponed({ next_due_on: '2026-11-28', postponed_to: '2026-11-21' })).toBe(false);
  });

  it('ikke utsatt uten utsettelse', () => {
    expect(isPostponed({ next_due_on: '2026-11-21', postponed_to: null })).toBe(false);
  });
});
