import { addDays, firstDayOfMonth, lastDayOfMonth, toIsoDate } from '../../../lib/dates';
import { planReminders, type PlanInput } from '../plan';
import { DEFAULT_REMINDER_SETTINGS, type Occurrence, type ReminderTask } from '../types';

// 2026-11-17 er en tirsdag. Forekomstene er det databasen (get_upcoming_occurrences) ville gitt.
const ME = 'member-me';
const CHILD = 'member-child';
const ON = { ...DEFAULT_REMINDER_SETTINGS, enabled: true };

function task(id: string, nextDue: string | null, extra: Partial<ReminderTask> = {}): ReminderTask {
  return { id, title: id, next_due_on: nextDue, assigned_member_id: null, is_month_task: false, is_daily: false, ...extra };
}

function plan(input: Partial<PlanInput> & Pick<PlanInput, 'tasks' | 'occurrences'>) {
  return planReminders({ today: '2026-11-17', settings: ON, myMemberId: ME, ...input });
}

/** Tekst per dato, så testene blir lette å lese. */
function bodies(input: Parameters<typeof plan>[0]): Record<string, string> {
  return Object.fromEntries(plan(input).map((r) => [r.date, r.body]));
}

describe('planReminders', () => {
  it('planlegger ingenting når påminnelser er av', () => {
    const tasks = [task('Søppel', '2026-11-17')];
    const occurrences = [{ task_id: 'Søppel', due_on: '2026-11-17' }];
    expect(plan({ tasks, occurrences, settings: DEFAULT_REMINDER_SETTINGS })).toEqual([]);
  });

  it('gir ett varsel på valgt tidspunkt for dagens oppgaver', () => {
    const tasks = [task('Søppel', '2026-11-17'), task('Rense sluk', '2026-11-17')];
    const occurrences: Occurrence[] = [
      { task_id: 'Søppel', due_on: '2026-11-17' },
      { task_id: 'Rense sluk', due_on: '2026-11-17' },
    ];
    const settings = { ...ON, hour: 6, minute: 5 };
    expect(plan({ tasks, occurrences, settings, days: 1 })).toEqual([
      { date: '2026-11-17', hour: 6, minute: 5, body: 'I dag: Søppel, Rense sluk' },
    ]);
  });

  it('sender ikke varsel en dag uten oppgaver', () => {
    const tasks = [task('Søppel', '2026-11-22')];
    const occurrences = [{ task_id: 'Søppel', due_on: '2026-11-22' }];
    // Bare søndag 22. november har noe. Mandag 23. er utenfor de 7 dagene (17.–23. er 7 dager),
    // men der ville den vært forfalt.
    expect(Object.keys(bodies({ tasks, occurrences }))).toEqual(['2026-11-22', '2026-11-23']);
    expect(bodies({ tasks, occurrences })['2026-11-23']).toBe('1 forfalt oppgave venter');
  });

  it('daglige oppgaver telles aldri som forfalt', () => {
    // Hverdager, glemt fredag 20. november: lørdag og søndag ingen varsel.
    const tasks = [task('Re opp senga', '2026-11-20', { is_daily: true })];
    const occurrences = [{ task_id: 'Re opp senga', due_on: '2026-11-23' }];
    expect(Object.keys(bodies({ tasks, occurrences }))).toEqual(['2026-11-23']);
  });

  it('planlegger 7 dager fram', () => {
    const tasks = [task('Hver dag', '2026-11-17')];
    const occurrences = Array.from({ length: 10 }, (_, i) => ({
      task_id: 'Hver dag',
      due_on: addDays('2026-11-17', i),
    }));
    const dates = plan({ tasks, occurrences }).map((r) => r.date);
    expect(dates).toEqual([
      '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23',
    ]);
  });

  it('nevner forfalte oppgaver kort, og sender også når bare forfalte gjenstår', () => {
    const tasks = [
      task('Søppel', '2026-11-17'),
      task('Støvsuge', '2026-11-10'),
      task('Vaske bad', '2026-11-15'),
    ];
    const occurrences = [{ task_id: 'Søppel', due_on: '2026-11-17' }];
    const result = bodies({ tasks, occurrences, days: 2 });
    expect(result['2026-11-17']).toBe('I dag: Søppel + 2 forfalt');
    // I morgen: ingenting nytt, og Søppel regnes som forfalt hvis den ikke blir gjort i dag.
    expect(result['2026-11-18']).toBe('3 forfalte oppgaver venter');
  });

  it('teller ikke en oppgave som forfalt den dagen den har en ny forekomst', () => {
    const tasks = [task('Hver dag', '2026-11-16')];
    const occurrences = [
      { task_id: 'Hver dag', due_on: '2026-11-17' },
      { task_id: 'Hver dag', due_on: '2026-11-18' },
    ];
    expect(bodies({ tasks, occurrences, days: 1 })['2026-11-17']).toBe('I dag: Hver dag');
  });

  it('tar med utførte engangsoppgaver (uten frist) aldri', () => {
    expect(plan({ tasks: [task('Ferdig', null)], occurrences: [] })).toEqual([]);
  });

  describe('omfang', () => {
    const tasks = [
      task('Min', '2026-11-17', { assigned_member_id: ME }),
      task('Felles', '2026-11-17'),
      task('Barnets', '2026-11-17', { assigned_member_id: CHILD }),
    ];
    const occurrences = tasks.map((t) => ({ task_id: t.id, due_on: '2026-11-17' }));

    it('«mine og felles» utelater andres oppgaver', () => {
      expect(bodies({ tasks, occurrences, days: 1 })['2026-11-17']).toBe('I dag: Min, Felles');
    });

    it('«hele husstanden» tar med alle', () => {
      const settings = { ...ON, scope: 'household' as const };
      expect(bodies({ tasks, occurrences, settings, days: 1 })['2026-11-17'])
        .toBe('I dag: Min, Felles, Barnets');
    });

    it('uten kjent medlem gjelder bare felles', () => {
      expect(bodies({ tasks, occurrences, myMemberId: null, days: 1 })['2026-11-17'])
        .toBe('I dag: Felles');
    });
  });

  describe('månedsoppgaver', () => {
    const month = (id: string, nextDue: string) => task(id, nextDue, { is_month_task: true });

    it('nevnes den 1. i måneden', () => {
      const tasks = [month('Rense takrenner', '2026-12-01')];
      const occurrences = [{ task_id: 'Rense takrenner', due_on: '2026-12-01' }];
      const result = bodies({ tasks, occurrences, today: '2026-11-28' });
      expect(result).toEqual({ '2026-12-01': 'Denne måneden: Rense takrenner' });
    });

    it('slås sammen med dagens oppgaver', () => {
      const tasks = [task('Søppel', '2026-12-01'), month('Rense takrenner', '2026-12-01')];
      const occurrences = [
        { task_id: 'Søppel', due_on: '2026-12-01' },
        { task_id: 'Rense takrenner', due_on: '2026-12-01' },
      ];
      expect(bodies({ tasks, occurrences, today: '2026-12-01', days: 1 })['2026-12-01'])
        .toBe('I dag: Søppel\nDenne måneden: Rense takrenner');
    });

    it('nevnes igjen første dag i siste uke hvis den ikke er gjort, og er ellers stille', () => {
      // November har 30 dager: siste uke starter 24. november.
      const tasks = [month('Rense takrenner', '2026-11-01')];
      expect(bodies({ tasks, occurrences: [], today: '2026-11-20' }))
        .toEqual({ '2026-11-24': 'Fortsatt denne måneden: Rense takrenner' });
    });

    it('nevnes ikke i siste uke når den er gjort (frist neste år)', () => {
      const tasks = [month('Rense takrenner', '2027-11-01')];
      expect(plan({ tasks, occurrences: [], today: '2026-11-20' })).toEqual([]);
    });

    it('er ikke forfalt før måneden er over, og forfalt etterpå', () => {
      const tasks = [month('Rense takrenner', '2026-11-01')];
      const result = bodies({ tasks, occurrences: [], today: '2026-11-28', days: 5 });
      // 28.–30. november: ikke forfalt (og ikke siste-uke-dagen). Fra 1. desember: forfalt.
      expect(result).toEqual({
        '2026-12-01': '1 forfalt oppgave venter',
        '2026-12-02': '1 forfalt oppgave venter',
      });
    });

    it('februar i skuddår: siste uke starter 23. februar', () => {
      const tasks = [month('Sjekke snøskuffe', '2028-02-01')];
      expect(Object.keys(bodies({ tasks, occurrences: [], today: '2028-02-20' })))
        .toEqual(['2028-02-23']);
    });
  });

  it('årsskifte: siste uke i desember, nyttårsdag og nye frister i januar', () => {
    const tasks = [
      task('Hver 3. dag', '2026-12-30'),
      task('Desember', '2026-12-01', { is_month_task: true }),
      task('Januar', '2027-01-01', { is_month_task: true }),
    ];
    const occurrences: Occurrence[] = [
      { task_id: 'Hver 3. dag', due_on: '2026-12-30' },
      { task_id: 'Hver 3. dag', due_on: '2027-01-02' },
      { task_id: 'Januar', due_on: '2027-01-01' },
    ];
    // 8 dager, så både 25. desember og 1. januar er med.
    expect(bodies({ tasks, occurrences, today: '2026-12-25', days: 8 })).toEqual({
      '2026-12-25': 'Fortsatt denne måneden: Desember', // 31 − 6 = 25.
      '2026-12-30': 'I dag: Hver 3. dag',
      '2026-12-31': '1 forfalt oppgave venter',
      // Desember er nå forfalt, og januar-oppgaven nevnes den 1.
      '2027-01-01': '2 forfalte oppgaver venter\nDenne måneden: Januar',
    });
  });
});

describe('datohjelpere', () => {
  it('addDays krysser månedsskifte og årsskifte', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2027-01-02', -3)).toBe('2026-12-30');
  });

  it('lastDayOfMonth og firstDayOfMonth', () => {
    expect(lastDayOfMonth('2026-11-17')).toBe('2026-11-30');
    expect(lastDayOfMonth('2028-02-10')).toBe('2028-02-29');
    expect(lastDayOfMonth('2026-12-05')).toBe('2026-12-31');
    expect(firstDayOfMonth('2026-11-17')).toBe('2026-11-01');
  });

  it('toIsoDate bruker lokal dato', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
