import { addDays } from '../../../lib/dates';
import type { RecentCompletion } from '../../completions/api';
import { THIS_MONTH_KEY } from '../../tasks/groupToday';
import type { UpcomingTask } from '../../tasks/upcoming';
import { boardPersonView, DISPLAY_UPCOMING_DAYS, focusedMember } from '../personView';
import type { BoardMember, BoardTask, FamilyBoard } from '../types';

const TODAY = '2026-11-19'; // torsdag

function member(id: string, role: BoardMember['role'] = 'child'): BoardMember {
  return {
    id,
    household_id: 'h',
    role,
    display_name: id.toUpperCase(),
    avatar: 'fox',
    avatar_mode: 'figure',
    photo_path: null,
  };
}

function todayTask(id: string, over: Partial<BoardTask> = {}): BoardTask {
  return {
    id,
    household_id: 'h',
    title: id,
    assigned_member_id: null,
    reward_nok: null,
    recurrence_type: 'interval',
    recurrence_unit: 'day',
    recurrence_every: 1,
    weekdays: null,
    month_day: null,
    month: null,
    job_repeats: false,
    job_member_ids: [],
    season_start_month: null,
    season_end_month: null,
    next_due_on: TODAY,
    is_overdue: false,
    is_month_task: false,
    ...over,
  };
}

function upcomingTask(id: string, over: Partial<UpcomingTask> = {}): UpcomingTask {
  return {
    id,
    title: id,
    assigned_member_id: 'k',
    reward_nok: null,
    recurrence_type: 'interval',
    recurrence_unit: 'week',
    recurrence_every: 1,
    weekdays: null,
    month_day: null,
    month: null,
    job_repeats: false,
    season_start_month: null,
    season_end_month: null,
    next_due_on: '2026-11-26',
    postponed_to: null,
    ...over,
  };
}

function recent(id: string, memberId: string, on: string): RecentCompletion {
  return {
    id,
    household_id: 'h',
    task_id: `t-${id}`,
    completed_by_member_id: memberId,
    completed_on: on,
    completed_at: `${on}T10:00:00Z`,
    reward_nok: null,
    status: 'approved',
    title: id,
    recurrence_type: 'interval',
  };
}

function board(over: Partial<FamilyBoard> = {}): FamilyBoard {
  return {
    household_id: 'h',
    household_name: 'Hjem',
    today: TODAY,
    members: [member('a', 'adult'), member('k'), member('l')],
    tasks: [],
    completions: [],
    upcoming_tasks: [],
    occurrences: [],
    recent: [],
    ...over,
  };
}

describe('boardPersonView', () => {
  it('«I dag»: bare personens kort og personens egne månedsoppgaver', () => {
    const view = boardPersonView(
      board({
        tasks: [
          todayTask('k1', { assigned_member_id: 'k' }),
          todayTask('l1', { assigned_member_id: 'l' }),
          todayTask('felles'),
          todayTask('jobb', { recurrence_type: 'job' }),
          todayTask('km', { assigned_member_id: 'k', is_month_task: true }),
          todayTask('lm', { assigned_member_id: 'l', is_month_task: true }),
        ],
      }),
      'k',
    );
    expect(view.sections.map((s) => s.key)).toEqual(['k', THIS_MONTH_KEY]);
    expect(view.sections[0].data.map((t) => t.id)).toEqual(['k1']);
    expect(view.sections[1].data.map((t) => t.id)).toEqual(['km']);
  });

  it('«I dag»: personen får kort også uten oppgaver', () => {
    const view = boardPersonView(board(), 'l');
    expect(view.sections.map((s) => s.key)).toEqual(['l']);
    expect(view.sections[0].data).toEqual([]);
  });

  it('«Kommende»: bare personens oppgaver, uten hyppige (ukentlige og oftere)', () => {
    const view = boardPersonView(
      board({
        upcoming_tasks: [
          upcomingTask('k-annenhver', { recurrence_every: 2 }),
          upcomingTask('k-uke'),
          upcomingTask('k-daglig', { recurrence_unit: 'day', next_due_on: addDays(TODAY, 1) }),
          upcomingTask('l-annenhver', { assigned_member_id: 'l', recurrence_every: 2 }),
        ],
        occurrences: [
          { task_id: 'k-annenhver', due_on: '2026-11-26' },
          { task_id: 'k-uke', due_on: '2026-11-26' },
          { task_id: 'k-uke', due_on: '2026-12-03' },
          ...Array.from({ length: DISPLAY_UPCOMING_DAYS }, (_, i) => ({
            task_id: 'k-daglig',
            due_on: addDays(TODAY, i + 1),
          })),
          { task_id: 'l-annenhver', due_on: '2026-11-26' },
        ],
      }),
      'k',
    );
    expect(view.upcoming.repeating).toEqual([]);
    const ids = view.upcoming.groups.flatMap((g) => g.items.map((i) => i.task.id));
    expect(ids).toEqual(['k-annenhver']);
  });

  it('«Kommende»: tomt når databasen ikke sender personvisningen ennå', () => {
    const view = boardPersonView(
      board({ upcoming_tasks: undefined, occurrences: undefined, recent: undefined }),
      'k',
    );
    expect(view.upcoming.groups).toEqual([]);
    expect(view.recentDays).toEqual([]);
  });

  it('«Gjort siste 3 dager»: bare det personen gjorde, nyeste dag først', () => {
    const view = boardPersonView(
      board({
        recent: [
          recent('k-i-går', 'k', '2026-11-18'),
          recent('l-i-går', 'l', '2026-11-18'),
          recent('k-mandag', 'k', '2026-11-16'),
        ],
      }),
      'k',
    );
    expect(view.recentDays.map((d) => d.title)).toEqual(['I går', 'Mandag']);
    expect(view.recentDays.flatMap((d) => d.items.map((c) => c.id))).toEqual(['k-i-går', 'k-mandag']);
  });
});

describe('focusedMember', () => {
  const members = [member('a', 'adult'), member('k')];

  it('gir den valgte personen', () => {
    expect(focusedMember(members, 'k')?.id).toBe('k');
  });

  it('gir null for «Alle» og for en person som er borte', () => {
    expect(focusedMember(members, null)).toBeNull();
    expect(focusedMember(members, 'slettet')).toBeNull();
  });
});
