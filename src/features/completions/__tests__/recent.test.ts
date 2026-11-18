import type { RecentCompletion } from '../api';
import { groupRecentByDay } from '../recent';

const TODAY = '2026-11-18'; // onsdag

const done = (overrides: Partial<RecentCompletion>) =>
  ({
    id: 'c',
    title: 'Oppgave',
    completed_by_member_id: 'leah',
    completed_on: '2026-11-17',
    completed_at: '2026-11-17T12:00:00Z',
    status: 'approved',
    reward_nok: null,
    ...overrides,
  }) as RecentCompletion;

describe('groupRecentByDay', () => {
  it('gir «I går» og ukedag, nyeste dag først', () => {
    const days = groupRecentByDay(
      [
        done({ id: '1', completed_on: '2026-11-15', completed_at: '2026-11-15T10:00:00Z' }),
        done({ id: '2', completed_on: '2026-11-17' }),
        done({ id: '3', completed_on: '2026-11-16', completed_at: '2026-11-16T10:00:00Z' }),
      ],
      'leah',
      TODAY,
    );
    expect(days.map((d) => d.title)).toEqual(['I går', 'Mandag', 'Søndag']);
    expect(days.map((d) => d.key)).toEqual(['2026-11-17', '2026-11-16', '2026-11-15']);
  });

  it('har nyeste avkrysning først innen dagen', () => {
    const days = groupRecentByDay(
      [
        done({ id: 'tidlig', completed_at: '2026-11-17T08:00:00Z' }),
        done({ id: 'sent', completed_at: '2026-11-17T19:00:00Z' }),
      ],
      'leah',
      TODAY,
    );
    expect(days).toHaveLength(1);
    expect(days[0].items.map((c) => c.id)).toEqual(['sent', 'tidlig']);
  });

  it('tar bare med det personen gjorde selv', () => {
    const days = groupRecentByDay(
      [done({ id: 'mine' }), done({ id: 'noah', completed_by_member_id: 'noah' })],
      'leah',
      TODAY,
    );
    expect(days.flatMap((d) => d.items.map((c) => c.id))).toEqual(['mine']);
  });

  it('gir tom liste når ingenting er gjort', () => {
    expect(groupRecentByDay([], 'leah', TODAY)).toEqual([]);
  });
});
