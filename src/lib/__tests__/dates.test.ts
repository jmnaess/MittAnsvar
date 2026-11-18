import { formatWeekdayDate, msUntilNextMidnight } from '../dates';

describe('formatWeekdayDate', () => {
  it('gir ukedag med stor forbokstav, dag og måned', () => {
    expect(formatWeekdayDate('2026-11-18')).toBe('Onsdag 18. november');
    expect(formatWeekdayDate('2026-11-22')).toBe('Søndag 22. november');
  });
});

describe('msUntilNextMidnight', () => {
  it('regner ut tiden til midnatt midt på dagen', () => {
    expect(msUntilNextMidnight(new Date(2026, 10, 18, 12, 0, 0))).toBe(12 * 60 * 60 * 1000);
  });

  it('gir et sekund like før midnatt', () => {
    expect(msUntilNextMidnight(new Date(2026, 10, 18, 23, 59, 59))).toBe(1000);
  });

  it('går over til neste måned', () => {
    expect(msUntilNextMidnight(new Date(2026, 10, 30, 23, 0, 0))).toBe(60 * 60 * 1000);
  });
});
