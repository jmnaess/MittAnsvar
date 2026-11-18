import { formatWeekdayDate } from '../dates';

describe('formatWeekdayDate', () => {
  it('gir ukedag med stor forbokstav, dag og måned', () => {
    expect(formatWeekdayDate('2026-11-18')).toBe('Onsdag 18. november');
    expect(formatWeekdayDate('2026-11-22')).toBe('Søndag 22. november');
  });
});
