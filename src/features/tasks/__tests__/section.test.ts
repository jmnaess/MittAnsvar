import { readFileSync } from 'fs';
import { join } from 'path';
import { taskSection } from '../section';

type Fields = Parameters<typeof taskSection>[0];

const r = (overrides: Partial<Fields>): Fields => ({
  recurrence_type: 'calendar',
  recurrence_unit: 'week',
  recurrence_every: 1,
  season_start_month: null,
  ...overrides,
});

describe('taskSection', () => {
  it('engangsoppgaver og ekstrajobber er i Hverdag', () => {
    expect(taskSection(r({ recurrence_type: 'once', recurrence_unit: null }))).toBe('everyday');
    expect(taskSection(r({ recurrence_type: 'job', recurrence_unit: null }))).toBe('everyday');
  });

  it('dag, uke og måned i kalenderen er i Hverdag', () => {
    expect(taskSection(r({ recurrence_unit: 'day' }))).toBe('everyday');
    expect(taskSection(r({ recurrence_unit: 'week' }))).toBe('everyday');
    expect(taskSection(r({ recurrence_unit: 'month' }))).toBe('everyday');
  });

  it('lange gjentakelser i kalenderen er i Årshjul, som intervall: 90 dager, 13 uker, 3 måneder', () => {
    const cal = (unit: 'day' | 'week' | 'month', every: number) => taskSection(r({ recurrence_unit: unit, recurrence_every: every }));
    expect(cal('day', 89)).toBe('everyday');
    expect(cal('day', 90)).toBe('year');
    expect(cal('week', 12)).toBe('everyday');
    expect(cal('week', 13)).toBe('year');
    expect(cal('month', 2)).toBe('everyday');
    expect(cal('month', 3)).toBe('year');
  });

  it('årlige oppgaver er i Årshjul', () => {
    expect(taskSection(r({ recurrence_unit: 'year' }))).toBe('year');
  });

  it('sesongoppgaver er i Årshjul, også ukentlige og korte intervaller', () => {
    expect(taskSection(r({ season_start_month: 5 }))).toBe('year');
    expect(taskSection(r({ recurrence_type: 'interval', recurrence_unit: 'week', season_start_month: 5 }))).toBe('year');
  });

  it('intervall i dager: 89 er Hverdag, 90 er Årshjul', () => {
    const interval = (every: number) => r({ recurrence_type: 'interval', recurrence_unit: 'day', recurrence_every: every });
    expect(taskSection(interval(14))).toBe('everyday');
    expect(taskSection(interval(89))).toBe('everyday');
    expect(taskSection(interval(90))).toBe('year');
  });

  it('intervall i uker: 12 er Hverdag, 13 er Årshjul', () => {
    const interval = (every: number) => r({ recurrence_type: 'interval', recurrence_unit: 'week', recurrence_every: every });
    expect(taskSection(interval(12))).toBe('everyday');
    expect(taskSection(interval(13))).toBe('year');
  });

  it('intervall i måneder: 2 er Hverdag, 3 er Årshjul', () => {
    const interval = (every: number) => r({ recurrence_type: 'interval', recurrence_unit: 'month', recurrence_every: every });
    expect(taskSection(interval(2))).toBe('everyday');
    expect(taskSection(interval(3))).toBe('year');
  });

  it('intervall i år er alltid Årshjul', () => {
    expect(taskSection(r({ recurrence_type: 'interval', recurrence_unit: 'year', recurrence_every: 1 }))).toBe('year');
  });
});

// Paritet med databasen: samme liste som get_family_board testes med (felles årshjul-oppgaver i
// upcoming_tasks). Listen står mellom de to parity-merkene i pgTAP-filen, så den finnes bare ett sted.
describe('taskSection: paritet med get_family_board', () => {
  type ParityCase = Fields & { title: string; year_wheel: boolean };
  const sql = readFileSync(
    join(__dirname, '../../../../supabase/tests/family_display_shared_year.test.sql'),
    'utf8',
  );
  const [, json] = sql.split('$parity$');
  const cases: ParityCase[] = JSON.parse(json);

  it('leser alle 18 tilfellene', () => {
    expect(cases).toHaveLength(18);
  });

  it.each(cases.map((c) => [c.title, c] as const))('%s', (_title, c) => {
    expect(taskSection(c)).toBe(c.year_wheel ? 'year' : 'everyday');
  });
});
