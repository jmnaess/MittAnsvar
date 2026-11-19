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
  it('engangsoppgaver og ledige jobber er i Hverdag', () => {
    expect(taskSection(r({ recurrence_type: 'once', recurrence_unit: null }))).toBe('everyday');
    expect(taskSection(r({ recurrence_type: 'job', recurrence_unit: null }))).toBe('everyday');
  });

  it('dag, uke og måned i kalenderen er i Hverdag', () => {
    expect(taskSection(r({ recurrence_unit: 'day' }))).toBe('everyday');
    expect(taskSection(r({ recurrence_unit: 'week' }))).toBe('everyday');
    expect(taskSection(r({ recurrence_unit: 'month' }))).toBe('everyday');
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
