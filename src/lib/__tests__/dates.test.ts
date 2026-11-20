import {
  formatWeekdayDate,
  formatWeekRange,
  householdToday,
  isoWeekNumber,
  msUntilNextMidnight,
  startOfIsoWeek,
  weekdayName,
} from '../dates';

describe('uker', () => {
  it('finner mandagen i uken', () => {
    expect(startOfIsoWeek('2026-11-18')).toBe('2026-11-16');
    expect(startOfIsoWeek('2026-11-16')).toBe('2026-11-16');
    expect(startOfIsoWeek('2026-11-22')).toBe('2026-11-16'); // søndag
    expect(startOfIsoWeek('2027-01-01')).toBe('2026-12-28');
  });

  it('gir ISO-ukenummer, også rundt årsskiftet', () => {
    expect(isoWeekNumber('2026-11-18')).toBe(47);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2027-01-03')).toBe(53);
    expect(isoWeekNumber('2027-01-04')).toBe(1);
    expect(isoWeekNumber('2025-12-29')).toBe(1); // tilhører 2026
  });

  it('skriver uken som et datoområde', () => {
    expect(formatWeekRange('2026-11-23')).toBe('23.–29. nov.');
    expect(formatWeekRange('2026-11-30')).toBe('30. nov.–6. des.');
  });

  it('gir ukedag med stor forbokstav', () => {
    expect(weekdayName('2026-11-16')).toBe('Mandag');
    expect(weekdayName('2026-11-22')).toBe('Søndag');
  });
});

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

describe('householdToday', () => {
  it('gir datoen i husstandens tidssone', () => {
    // 23:30 UTC 21. nov. er 00:30 22. nov. i Oslo.
    expect(householdToday('Europe/Oslo', new Date('2026-11-21T23:30:00Z'))).toBe('2026-11-22');
    expect(householdToday('Europe/Oslo', new Date('2026-11-21T12:00:00Z'))).toBe('2026-11-21');
    // Sommertid: 22:30 UTC 30. juni er 00:30 1. juli.
    expect(householdToday('Europe/Oslo', new Date('2026-06-30T22:30:00Z'))).toBe('2026-07-01');
  });

  it('bruker enhetens dato når tidssonen er ukjent', () => {
    const now = new Date(2026, 10, 21, 12, 0);
    expect(householdToday('Ikke/En_Sone', now)).toBe('2026-11-21');
  });
});
