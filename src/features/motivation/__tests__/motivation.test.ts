import { addDays } from '../../../lib/dates';
import {
  greetingFor,
  heroState,
  isYoungChild,
  noWidow,
  progressA11yLabel,
  todayProgressText,
  weekRange,
  weekStats,
  weekText,
} from '../heroCard';
import { DAILY_PHRASES, phraseForDate } from '../phrases';

describe('dagens setning', () => {
  it('lista har 20–30 unike, korte setninger med punktum', () => {
    expect(DAILY_PHRASES.length).toBeGreaterThanOrEqual(20);
    expect(DAILY_PHRASES.length).toBeLessThanOrEqual(30);
    expect(new Set(DAILY_PHRASES).size).toBe(DAILY_PHRASES.length);
    for (const p of DAILY_PHRASES) {
      expect(p.length).toBeLessThanOrEqual(70);
      expect(p).toMatch(/\.$/);
    }
  });

  it('er lik hele dagen og skifter neste dag', () => {
    expect(phraseForDate('2026-11-21')).toBe(phraseForDate('2026-11-21'));
    expect(phraseForDate('2026-11-22')).not.toBe(phraseForDate('2026-11-21'));
  });

  it('bruker hele lista før noe kommer igjen, også over årsskiftet', () => {
    const start = '2026-12-20';
    const days = Array.from({ length: DAILY_PHRASES.length }, (_, i) => phraseForDate(addDays(start, i)));
    expect(new Set(days).size).toBe(DAILY_PHRASES.length);
    expect(phraseForDate(addDays(start, DAILY_PHRASES.length))).toBe(days[0]);
  });

  it('gir ikke ett ord alene på siste linje', () => {
    expect(noWidow('Den som er tro i det små, får ansvar for mer.')).toBe(
      'Den som er tro i det små, får ansvar for mer.',
    );
    expect(noWidow('Hei.')).toBe('Hei.');
  });
});

describe('hilsen og framgang', () => {
  it('hilser etter tid på døgnet', () => {
    expect(greetingFor(4, 'Leah')).toBe('God kveld, Leah!');
    expect(greetingFor(5, 'Leah')).toBe('God morgen, Leah!');
    expect(greetingFor(11, 'Leah')).toBe('God morgen, Leah!');
    expect(greetingFor(12, 'Leah')).toBe('God ettermiddag, Leah!');
    expect(greetingFor(17, 'Leah')).toBe('God ettermiddag, Leah!');
    expect(greetingFor(18, 'Leah')).toBe('God kveld, Leah!');
    expect(greetingFor(23, 'Leah')).toBe('God kveld, Leah!');
  });

  it('finner tilstanden', () => {
    expect(heroState(3, 2)).toBe('progress');
    expect(heroState(0, 5)).toBe('allDone');
    expect(heroState(0, 0)).toBe('empty');
    expect(heroState(4, 0)).toBe('progress');
  });

  it('skriver framgangen', () => {
    expect(todayProgressText(3, 2)).toBe('2 av 5 i dag');
    expect(progressA11yLabel(3, 2)).toBe('2 av 5 oppgaver gjort i dag');
  });

  it('5 år og yngre får den enkle varianten', () => {
    expect(isYoungChild({ birth_year: 2021 }, 2026)).toBe(true);
    expect(isYoungChild({ birth_year: 2020 }, 2026)).toBe(false);
    expect(isYoungChild({ birth_year: null }, 2026)).toBe(false);
  });
});

describe('denne uka', () => {
  it('går fra mandag til søndag', () => {
    expect(weekRange('2026-11-21')).toEqual({ monday: '2026-11-16', sunday: '2026-11-22' });
    expect(weekRange('2026-11-22')).toEqual({ monday: '2026-11-16', sunday: '2026-11-22' }); // søndag
    expect(weekRange('2026-11-23')).toEqual({ monday: '2026-11-23', sunday: '2026-11-29' }); // mandag
    expect(weekRange('2027-01-01')).toEqual({ monday: '2026-12-28', sunday: '2027-01-03' });
  });

  it('teller gjort og tjent (godkjent + venter), ikke avviste', () => {
    expect(
      weekStats([
        { reward_nok: 20, status: 'approved' },
        { reward_nok: 15, status: 'pending' },
        { reward_nok: null, status: 'approved' },
        { reward_nok: 50, status: 'rejected' },
      ]),
    ).toEqual({ count: 3, earnedNok: 35 });
    expect(weekStats([])).toEqual({ count: 0, earnedNok: 0 });
  });

  it('skriver uka, uten lønn bare antall', () => {
    expect(weekText({ count: 12, earnedNok: 85 })).toBe('Denne uka: 12 oppgaver gjort · 85 kr tjent');
    expect(weekText({ count: 12, earnedNok: 0 })).toBe('Denne uka: 12 oppgaver gjort');
    expect(weekText({ count: 1, earnedNok: 0 })).toBe('Denne uka: 1 oppgave gjort');
    expect(weekText({ count: 0, earnedNok: 0 })).toBeUndefined();
  });
});
