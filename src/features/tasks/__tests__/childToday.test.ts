import { childTodaySections, MINE_KEY } from '../childToday';
import { JOBS_KEY } from '../groupToday';
import type { TodayTask } from '../types';

const task = (overrides: Partial<TodayTask>) =>
  ({
    id: 't',
    title: 'Oppgave',
    recurrence_type: 'calendar',
    assigned_member_id: null,
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

  it('skjuler tomme seksjoner', () => {
    expect(childTodaySections([task({ id: 'x', assigned_member_id: 'ola' })], 'leah')).toEqual([]);
  });
});
