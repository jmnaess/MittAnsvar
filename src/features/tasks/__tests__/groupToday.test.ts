import type { TodayCompletion } from '../../completions/api';
import type { Member } from '../../household/types';
import { focusSections, groupTodayByMember, JOBS_KEY, THIS_MONTH_KEY } from '../groupToday';
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
  avatar_mode: 'figure',
  photo_path: null,
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

  it('legger dagens avkrysninger i personens kort, og viser kortet selv uten oppgaver igjen', () => {
    const gjort = { id: 'c', assigned_member_id: 'leah', completed_by_member_id: 'leah', recurrence_type: 'calendar' } as TodayCompletion;
    const felles = { id: 'f', assigned_member_id: null, completed_by_member_id: 'leah', recurrence_type: 'calendar' } as TodayCompletion;
    const sections = groupTodayByMember([], [leah], { done: [gjort, felles] });
    expect(sections.map((s) => s.key)).toEqual(['leah', 'shared']);
    expect(sections[0].data).toEqual([]);
    expect(sections[0].done.map((c) => c.id)).toEqual(['c']);
    expect(sections[1].done.map((c) => c.id)).toEqual(['f']);
  });

  it('legger «Denne måneden» nederst, etter «Ledige jobber». Forfalte ligger hos personen', () => {
    const maned = task({ id: 'm', is_month_task: true, assigned_member_id: 'leah' });
    const forfalt = task({ id: 'f', is_month_task: true, is_overdue: true, assigned_member_id: 'leah' });
    const felles = task({ id: 's' });
    const job = task({ id: 'j', recurrence_type: 'job' });
    const sections = groupTodayByMember([maned, forfalt, felles, job], [leah]);
    expect(sections.map((s) => [s.key, s.data.map((t) => t.id)])).toEqual([
      ['leah', ['f']],
      ['shared', ['s']],
      [JOBS_KEY, ['j']],
      [THIS_MONTH_KEY, ['m']],
    ]);
  });
});

describe('focusSections', () => {
  const ola: Member = { ...leah, id: 'ola', display_name: 'Ola' };
  const all = groupTodayByMember(
    [
      task({ id: 'l1', assigned_member_id: 'leah' }),
      task({ id: 'o1', assigned_member_id: 'ola' }),
      task({ id: 'f1' }),
      task({ id: 'lm', assigned_member_id: 'leah', is_month_task: true }),
      task({ id: 'om', assigned_member_id: 'ola', is_month_task: true }),
    ],
    [leah, ola],
  );

  it('gir personens kort og bare personens månedsoppgaver', () => {
    const sections = focusSections(all, 'leah');
    expect(sections.map((s) => s.key)).toEqual(['leah', THIS_MONTH_KEY]);
    expect(sections[0].data.map((t) => t.id)).toEqual(['l1']);
    expect(sections[1].data.map((t) => t.id)).toEqual(['lm']);
  });

  it('dropper «Denne måneden» når personen ikke har noen der', () => {
    const sections = focusSections(groupTodayByMember([task({ id: 'l1', assigned_member_id: 'leah' })], [leah, ola]), 'leah');
    expect(sections.map((s) => s.key)).toEqual(['leah']);
  });

  it('gir ingenting for en ukjent person', () => {
    expect(focusSections(all, 'borte')).toEqual([]);
  });
});
