import type { Member } from '../../household/types';
import { groupTodayByMember, JOBS_KEY } from '../groupToday';
import type { TodayTask } from '../types';

const leah: Member = {
  id: 'leah',
  role: 'child',
  household_id: 'h',
  display_name: 'Leah',
  avatar: 'fox',
  birth_year: null,
  auth_user_id: null,
  created_at: '2026-01-01T00:00:00Z',
};

const task = (overrides: Partial<TodayTask>) =>
  ({
    id: 't',
    title: 'Oppgave',
    recurrence_type: 'calendar',
    assigned_member_id: null,
    is_month_task: false,
    is_overdue: false,
    ...overrides,
  }) as TodayTask;

describe('groupTodayByMember', () => {
  it('skjuler tomme seksjoner', () => {
    expect(groupTodayByMember([], [leah])).toEqual([]);
  });

  it('viser tom «Ledige jobber» når showEmptyJobs er satt', () => {
    const sections = groupTodayByMember([], [leah], { showEmptyJobs: true });
    expect(sections.map((s) => s.key)).toEqual([JOBS_KEY]);
    expect(sections[0].data).toEqual([]);
  });

  it('legger jobber i «Ledige jobber», også når de er for ett barn', () => {
    const job = task({ id: 'j', recurrence_type: 'job', assigned_member_id: 'leah' });
    const vanlig = task({ id: 'v', assigned_member_id: 'leah' });
    const sections = groupTodayByMember([job, vanlig], [leah]);
    expect(sections.map((s) => [s.key, s.data.map((t) => t.id)])).toEqual([
      ['leah', ['v']],
      [JOBS_KEY, ['j']],
    ]);
  });
});
