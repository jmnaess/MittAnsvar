import {
  defaultRecurrenceForm,
  describeSchedule,
  fromRecurrence,
  isDailyRecurrence,
  sameWhen,
  toRecurrence,
  type Schedule,
} from '../recurrence';

const today = '2026-11-18'; // onsdag

const once = (once_on: string | null, next_due_on: string | null = once_on) => ({
  recurrence_type: 'once' as const,
  recurrence_unit: null,
  recurrence_every: null,
  weekdays: null,
  month_day: null,
  month: null,
  job_repeats: false,
  once_on,
  next_due_on,
  season_start_month: null,
  season_end_month: null,
});

describe('«Når?» → kolonner', () => {
  it('I dag er forhåndsvalgt og gir en engangsoppgave i dag', () => {
    const form = defaultRecurrenceForm(today);
    expect(form.when).toBe('today');
    expect(toRecurrence(form, today)).toMatchObject({ recurrence_type: 'once', once_on: today });
  });

  it('I morgen og Velg dato gir en engangsoppgave med den datoen', () => {
    const form = defaultRecurrenceForm(today);
    expect(toRecurrence({ ...form, when: 'tomorrow' }, today)?.once_on).toBe('2026-11-19');
    expect(toRecurrence({ ...form, when: 'date', date: '2026-12-24' }, today)?.once_on).toBe('2026-12-24');
  });

  it('Til helga og Neste uke gir en engangsoppgave lørdag og mandag neste uke', () => {
    // today er onsdag 18. november 2026.
    const form = defaultRecurrenceForm(today);
    expect(toRecurrence({ ...form, when: 'weekend' }, today)).toMatchObject({ recurrence_type: 'once', once_on: '2026-11-21' });
    expect(toRecurrence({ ...form, when: 'nextWeek' }, today)).toMatchObject({ recurrence_type: 'once', once_on: '2026-11-23' });
  });

  it('Velg dato starter i overmorgen', () => {
    expect(defaultRecurrenceForm(today).date).toBe('2026-11-20');
  });

  it('Gjentas gir fast dag eller intervall, uten once_on', () => {
    const form = { ...defaultRecurrenceForm(today), when: 'repeat' as const };
    expect(toRecurrence({ ...form, weekdays: [1] }, today)).toMatchObject({
      recurrence_type: 'calendar', recurrence_unit: 'week', weekdays: [1], once_on: null,
    });
    expect(toRecurrence({ ...form, mode: 'interval', intervalEvery: '3', intervalUnit: 'month' }, today))
      .toMatchObject({ recurrence_type: 'interval', recurrence_every: 3, recurrence_unit: 'month', once_on: null });
  });

  it('Gjentas uten ukedag er ikke gyldig ennå', () => {
    expect(toRecurrence({ ...defaultRecurrenceForm(today), when: 'repeat' }, today)).toBeNull();
  });
});

describe('kolonner → «Når?» (endre oppgave)', () => {
  it('engangsoppgave med dato i dag, i morgen eller senere', () => {
    expect(fromRecurrence(once(today), today).when).toBe('today');
    expect(fromRecurrence(once('2026-11-19'), today).when).toBe('tomorrow');
    expect(fromRecurrence(once('2026-12-24'), today)).toMatchObject({ when: 'date', date: '2026-12-24' });
  });

  it('eldre engangsoppgave uten once_on bruker fristen, og en utført uten noe blir I dag', () => {
    expect(fromRecurrence(once(null, '2026-11-15'), today)).toMatchObject({ when: 'date', date: '2026-11-15' });
    expect(fromRecurrence(once(null, null), today).when).toBe('today');
  });

  it('gjentakende oppgave viser Gjentas', () => {
    const r = { ...once(null), recurrence_type: 'interval' as const, recurrence_unit: 'day' as const, recurrence_every: 14 };
    expect(fromRecurrence(r, today)).toMatchObject({ when: 'repeat', mode: 'interval', intervalEvery: '14' });
  });

  it('sameWhen: bare endret dato eller valg teller som endring', () => {
    const a = fromRecurrence(once('2026-12-24'), today);
    expect(sameWhen(a, { ...a, title: 'x' } as typeof a)).toBe(true);
    expect(sameWhen(a, { ...a, date: '2026-12-25' })).toBe(false);
    expect(sameWhen(a, { ...a, when: 'today' })).toBe(false);
  });
});

describe('describeSchedule', () => {
  const s = (once_on: string): Schedule => once(once_on);
  it('I dag, I morgen eller dato', () => {
    expect(describeSchedule(s(today), today)).toBe('I dag');
    expect(describeSchedule(s('2026-11-19'), today)).toBe('I morgen');
    expect(describeSchedule(s('2026-11-26'), today)).toBe('Tor. 26. nov.');
  });
});

describe('isDailyRecurrence', () => {
  const r = (
    recurrence_type: 'calendar' | 'interval' | 'once' | 'job',
    recurrence_unit: 'day' | 'week' | 'month' | 'year' | null,
    recurrence_every: number | null,
    weekdays: number[] | null = null,
  ) => ({ recurrence_type, recurrence_unit, recurrence_every, weekdays });

  it('hver dag og 1 dag etter sist er daglig', () => {
    expect(isDailyRecurrence(r('calendar', 'day', 1))).toBe(true);
    expect(isDailyRecurrence(r('interval', 'day', 1))).toBe(true);
  });

  it('hver uke på alle hverdagene er daglig', () => {
    expect(isDailyRecurrence(r('calendar', 'week', 1, [1, 2, 3, 4, 5]))).toBe(true);
    expect(isDailyRecurrence(r('calendar', 'week', 1, [1, 2, 3, 4, 5, 6, 7]))).toBe(true);
  });

  it('sjeldnere enn daglig er ikke daglig', () => {
    expect(isDailyRecurrence(r('calendar', 'day', 2))).toBe(false);
    expect(isDailyRecurrence(r('calendar', 'week', 1, [1, 2, 3, 4]))).toBe(false);
    expect(isDailyRecurrence(r('calendar', 'week', 2, [1, 2, 3, 4, 5]))).toBe(false);
    expect(isDailyRecurrence(r('interval', 'week', 1))).toBe(false);
    expect(isDailyRecurrence(r('once', null, null))).toBe(false);
  });
});
