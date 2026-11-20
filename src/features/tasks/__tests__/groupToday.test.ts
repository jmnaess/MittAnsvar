import type { TodayCompletion } from '../../completions/api';
import type { Member } from '../../household/types';
import { cardDoerId, focusSections, groupTodayByMember, JOBS_KEY, THIS_MONTH_KEY } from '../groupToday';
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
    season_start_month: null,
    ...overrides,
  }) as TodayTask;

describe('groupTodayByMember', () => {
  it('skjuler tomme seksjoner', () => {
    expect(groupTodayByMember([], [leah])).toEqual([]);
  });

  it('viser tom «Ekstrajobber» når showEmptyJobs er satt', () => {
    const sections = groupTodayByMember([], [leah], { showEmptyJobs: true });
    expect(sections.map((s) => s.key)).toEqual([JOBS_KEY]);
    expect(sections[0].data).toEqual([]);
  });

  it('legger jobber i «Ekstrajobber», også når de er for ett barn', () => {
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

  it('legger «Denne måneden» nederst, etter «Ekstrajobber». Forfalte ligger hos personen', () => {
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

describe('focusSections: felles årshjul-oppgaver', () => {
  const kari: Member = { ...leah, id: 'kari', role: 'adult', display_name: 'Kari' };
  const year = { recurrence_type: 'calendar', recurrence_unit: 'year', recurrence_every: 1 } as const;
  const all = groupTodayByMember(
    [
      task({ id: 'k1', assigned_member_id: 'kari' }),
      task({ id: 'felles-uke', recurrence_unit: 'week' }),
      task({ id: 'felles-årlig', ...year }),
      task({ id: 'felles-sesong', recurrence_unit: 'week', season_start_month: 4 }),
      task({ id: 'leah-årlig', ...year, assigned_member_id: 'leah' }),
      task({ id: 'felles-måned', ...year, is_month_task: true }),
      task({ id: 'leah-måned', ...year, assigned_member_id: 'leah', is_month_task: true }),
      task({ id: 'kari-måned', ...year, assigned_member_id: 'kari', is_month_task: true }),
    ],
    [kari, leah],
    { showAllMembers: true },
  );

  it('voksen: felles årshjul i kortet (sist), felles månedsoppgaver i «Denne måneden»', () => {
    const sections = focusSections(all, 'kari', { includeShared: true });
    expect(sections.map((s) => [s.key, s.data.map((t) => t.id)])).toEqual([
      ['kari', ['k1', 'felles-årlig', 'felles-sesong']],
      [THIS_MONTH_KEY, ['felles-måned', 'kari-måned']],
    ]);
  });

  it('uten includeShared (barn): bare egne', () => {
    const sections = focusSections(all, 'leah');
    expect(sections.map((s) => [s.key, s.data.map((t) => t.id)])).toEqual([
      ['leah', ['leah-årlig']],
      [THIS_MONTH_KEY, ['leah-måned']],
    ]);
  });

  it('voksen med bare felles månedsoppgaver får «Denne måneden»', () => {
    const only = groupTodayByMember([task({ id: 'fm', ...year, is_month_task: true })], [kari], {
      showAllMembers: true,
    });
    const sections = focusSections(only, 'kari', { includeShared: true });
    expect(sections.map((s) => [s.key, s.data.map((t) => t.id)])).toEqual([
      ['kari', []],
      [THIS_MONTH_KEY, ['fm']],
    ]);
  });
});

describe('cardDoerId', () => {
  const kari = { id: 'kari' };

  it('felles rad i personens kort: personen', () => {
    expect(cardDoerId({ member: kari }, { assigned_member_id: null })).toBe('kari');
  });

  it('personens egen rad: vanlig regel', () => {
    expect(cardDoerId({ member: kari }, { assigned_member_id: 'kari' })).toBeNull();
  });

  it('«Felles», «Denne måneden» og «Ekstrajobber» (uten person): vanlig regel, det spørres som før', () => {
    expect(cardDoerId({ member: null }, { assigned_member_id: null })).toBeNull();
  });
});
