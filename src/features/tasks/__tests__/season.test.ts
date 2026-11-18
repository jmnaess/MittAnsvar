import {
  defaultRecurrenceForm,
  describeRecurrence,
  formatSeason,
  fromRecurrence,
  inSeason,
  isSeasonal,
  repeatHint,
  toRecurrence,
  type RecurrenceForm,
} from '../recurrence';
import type { Recurrence } from '../types';

// Sesongoppgaver (aktiv periode). Se docs/DATABASE.md §2 (Sesong).

const today = '2026-11-18'; // november

const NONE: Recurrence = {
  recurrence_type: 'interval',
  recurrence_unit: 'week',
  recurrence_every: 8,
  weekdays: null,
  month_day: null,
  month: null,
  job_repeats: false,
  season_start_month: null,
  season_end_month: null,
};

const repeat = (changes: Partial<RecurrenceForm>): RecurrenceForm => ({
  ...defaultRecurrenceForm(today),
  when: 'repeat',
  weekdays: [6],
  ...changes,
});

describe('formatSeason og inSeason', () => {
  it('«mai–sep», «okt–apr» og én måned', () => {
    expect(formatSeason(5, 9)).toBe('mai–sep');
    expect(formatSeason(10, 4)).toBe('okt–apr');
    expect(formatSeason(6, 6)).toBe('jun');
  });

  it('innenfor ett år', () => {
    expect([4, 5, 9, 10].map((m) => inSeason(m, 5, 9))).toEqual([false, true, true, false]);
  });

  it('over nyttår', () => {
    expect([9, 10, 1, 4, 5].map((m) => inSeason(m, 10, 4))).toEqual([false, true, true, true, false]);
  });
});

describe('describeRecurrence med periode', () => {
  it('legger perioden etter gjentakelsen', () => {
    expect(describeRecurrence({ ...NONE, season_start_month: 10, season_end_month: 4 })).toBe(
      '8 uker etter sist · okt–apr',
    );
    expect(
      describeRecurrence({
        ...NONE,
        recurrence_type: 'calendar',
        recurrence_every: 1,
        weekdays: [6],
        season_start_month: 5,
        season_end_month: 9,
      }),
    ).toBe('Hver lørdag · mai–sep');
    expect(
      describeRecurrence({ ...NONE, recurrence_every: 1, season_start_month: 5, season_end_month: 9 }),
    ).toBe('1 uke etter sist · mai–sep');
  });

  it('uten periode er teksten som før', () => {
    expect(describeRecurrence(NONE)).toBe('8 uker etter sist');
    expect(isSeasonal(NONE)).toBe(false);
  });
});

describe('skjema ↔ kolonner', () => {
  it('«Bare deler av året» gir periodekolonnene', () => {
    expect(toRecurrence(repeat({ seasonal: true, seasonFrom: 5, seasonTo: 9 }), today)).toMatchObject({
      recurrence_type: 'calendar',
      season_start_month: 5,
      season_end_month: 9,
    });
    expect(
      toRecurrence(repeat({ mode: 'interval', intervalEvery: '8', intervalUnit: 'week', seasonal: true, seasonFrom: 10, seasonTo: 4 }), today),
    ).toMatchObject({ recurrence_type: 'interval', season_start_month: 10, season_end_month: 4 });
  });

  it('av: ingen periode, selv om månedene er valgt', () => {
    expect(toRecurrence(repeat({ seasonal: false, seasonFrom: 5, seasonTo: 9 }), today)).toMatchObject({
      season_start_month: null,
      season_end_month: null,
    });
  });

  it('årlige oppgaver og engangsoppgaver får aldri periode', () => {
    const yearly = repeat({ calendarUnit: 'year', month: 10, monthDay: '', seasonal: true });
    expect(toRecurrence(yearly, today)).toMatchObject({ season_start_month: null, season_end_month: null });
    expect(toRecurrence({ ...repeat({ seasonal: true }), when: 'today' }, today)).toMatchObject({
      season_start_month: null,
    });
  });

  it('alle tolv måneder er det samme som hele året', () => {
    expect(toRecurrence(repeat({ seasonal: true, seasonFrom: 1, seasonTo: 12 }), today)?.season_start_month).toBeNull();
    expect(toRecurrence(repeat({ seasonal: true, seasonFrom: 3, seasonTo: 2 }), today)?.season_start_month).toBeNull();
  });

  it('rundtur: en oppgave med periode åpnes med bryteren på og riktige måneder', () => {
    const r = { ...NONE, season_start_month: 10, season_end_month: 4, once_on: null, next_due_on: null };
    const form = fromRecurrence(r, today);
    expect(form).toMatchObject({ seasonal: true, seasonFrom: 10, seasonTo: 4 });
    expect(toRecurrence(form, today)).toMatchObject({ season_start_month: 10, season_end_month: 4 });
  });

  it('uten periode: bryteren er av, mai–sep er forhåndsvalgt', () => {
    expect(fromRecurrence({ ...NONE, once_on: null, next_due_on: null }, today)).toMatchObject({
      seasonal: false,
      seasonFrom: 5,
      seasonTo: 9,
    });
  });
});

describe('repeatHint', () => {
  it('uten periode som før', () => {
    expect(repeatHint(repeat({ mode: 'interval' }), today)).toBe(
      'Første gang er i dag. Deretter teller vi fra hver gang den blir gjort.',
    );
  });

  it('utenfor perioden (november, mai–sep): første gang er når perioden starter', () => {
    expect(repeatHint(repeat({ mode: 'interval', seasonal: true }), today)).toBe(
      'Første gang er 1. mai. Deretter teller vi fra hver gang den blir gjort. Utenfor perioden vises den ikke.',
    );
    expect(repeatHint(repeat({ seasonal: true }), today)).toBe(
      'Første gang er den første dagen som passer fra 1. mai. Utenfor perioden vises den ikke.',
    );
  });

  it('innenfor perioden (november, okt–apr): fra i dag', () => {
    expect(repeatHint(repeat({ mode: 'interval', seasonal: true, seasonFrom: 10, seasonTo: 4 }), today)).toBe(
      'Første gang er i dag. Deretter teller vi fra hver gang den blir gjort. Utenfor perioden vises den ikke.',
    );
  });

  it('engangsoppgave', () => {
    expect(repeatHint(defaultRecurrenceForm(today), today)).toBe('Vises på dagen og forsvinner når den er gjort.');
  });
});
