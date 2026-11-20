import type { TodayCompletion } from '../../completions/api';
import { childTodaySections, MINE_KEY } from '../childToday';
import { JOBS_KEY } from '../groupToday';
import type { TodayTask } from '../types';

const task = (overrides: Partial<TodayTask>) =>
  ({
    id: 't',
    title: 'Oppgave',
    recurrence_type: 'calendar',
    assigned_member_id: null,
    recurrence_unit: 'day',
    recurrence_every: 1,
    season_start_month: null,
    job_member_ids: [],
    is_month_task: false,
    is_overdue: false,
    ...overrides,
  }) as TodayTask;

const ids = (tasks: TodayTask[]) => tasks.map((t) => t.id);

describe('childTodaySections', () => {
  const tasks = [
    task({ id: 'egen', assigned_member_id: 'leah' }),
    task({ id: 'felles' }),
    task({ id: 'søsken', assigned_member_id: 'ola' }),
    task({ id: 'jobb-alle', recurrence_type: 'job' }),
    task({ id: 'jobb-leah', recurrence_type: 'job', job_member_ids: ['leah', 'emma'] }),
    task({ id: 'jobb-ola', recurrence_type: 'job', job_member_ids: ['ola'] }),
  ];

  it('viser egne og felles oppgaver, ikke søskens', () => {
    const mine = childTodaySections(tasks, 'leah').find((s) => s.key === MINE_KEY)!;
    expect(ids(mine.data)).toEqual(['egen', 'felles']);
  });

  it('viser jobber for alle barna og for barnet, ikke for andre barn', () => {
    const jobs = childTodaySections(tasks, 'leah').find((s) => s.key === JOBS_KEY)!;
    expect(ids(jobs.data)).toEqual(['jobb-alle', 'jobb-leah']);
  });

  it('viser ikke felles årshjul-oppgaver (årlig, sesong, lang gjentakelse, månedsoppgave)', () => {
    const year = [
      task({ id: 'årlig', recurrence_unit: 'year', recurrence_every: 1 }),
      task({ id: 'sesong', recurrence_unit: 'week', recurrence_every: 1, season_start_month: 4 }),
      task({ id: 'kvartal', recurrence_type: 'interval', recurrence_unit: 'month', recurrence_every: 3 }),
      task({ id: 'måned', recurrence_unit: 'year', recurrence_every: 1, is_month_task: true }),
    ];
    expect(childTodaySections(year, 'leah')).toEqual([]);
  });

  it('viser felles hverdagsoppgaver og årshjul-oppgaver som står på barnet', () => {
    const mixed = [
      task({ id: 'ukentlig', recurrence_unit: 'week', recurrence_every: 1 }),
      task({ id: 'månedlig', recurrence_unit: 'month', recurrence_every: 1 }),
      task({ id: 'egen-årlig', assigned_member_id: 'leah', recurrence_unit: 'year', recurrence_every: 1 }),
      task({ id: 'felles-årlig', recurrence_unit: 'year', recurrence_every: 1 }),
    ];
    const mine = childTodaySections(mixed, 'leah').find((s) => s.key === MINE_KEY)!;
    expect(ids(mine.data)).toEqual(['ukentlig', 'månedlig', 'egen-årlig']);
  });

  it('skjuler tomme seksjoner', () => {
    expect(childTodaySections([task({ id: 'x', assigned_member_id: 'ola' })], 'leah')).toEqual([]);
  });

  it('godkjent forslag: gjort står som utført i «Mine oppgaver i dag», ikke gjort som oppgave', () => {
    // Gjort: arkivert engangsjobb, krysset av for Leah. Ikke gjort: engangsoppgave til Leah i dag.
    const gjort = {
      id: 'c',
      assigned_member_id: null,
      completed_by_member_id: 'leah',
      recurrence_type: 'job',
      reward_nok: 30,
    } as TodayCompletion;
    const sections = childTodaySections(
      [task({ id: 'vaske-bilen', recurrence_type: 'once', assigned_member_id: 'leah' })],
      'leah',
      [gjort],
    );
    const mine = sections.find((s) => s.key === MINE_KEY)!;
    expect(ids(mine.data)).toEqual(['vaske-bilen']);
    expect(mine.done.map((c) => c.id)).toEqual(['c']);
    expect(sections.some((s) => s.key === JOBS_KEY)).toBe(false);
  });
});
