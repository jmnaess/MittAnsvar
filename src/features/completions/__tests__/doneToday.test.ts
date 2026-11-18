import type { TodayCompletion } from '../api';
import { canUndo, doneByText, doneSectionKey, SHARED_KEY, UNDO_WINDOW_MS } from '../doneToday';

const NOW = Date.parse('2026-11-18T12:00:00Z');

const done = (overrides: Partial<TodayCompletion>) =>
  ({
    id: 'c',
    task_id: 't',
    title: 'Oppgave',
    assigned_member_id: null,
    completed_by_member_id: 'leah',
    recorded_by: 'user-leah',
    recurrence_type: 'calendar',
    completed_at: new Date(NOW - 60_000).toISOString(),
    is_latest: true,
    reward_nok: null,
    status: 'approved',
    ...overrides,
  }) as TodayCompletion;

const members = new Set(['leah', 'jesper']);
const names: Record<string, string> = { leah: 'Leah', jesper: 'Jesper' };
const nameOf = (id: string) => names[id];

describe('doneSectionKey', () => {
  it('legger oppgaven hos den ansvarlige', () => {
    expect(doneSectionKey(done({ assigned_member_id: 'jesper' }), members)).toBe('jesper');
  });

  it('legger ledige jobber hos den som tok dem', () => {
    expect(doneSectionKey(done({ recurrence_type: 'job' }), members)).toBe('leah');
  });

  it('legger felles og ukjente ansvarlige i «Felles»', () => {
    expect(doneSectionKey(done({}), members)).toBe(SHARED_KEY);
    expect(doneSectionKey(done({ assigned_member_id: 'borte' }), members)).toBe(SHARED_KEY);
  });
});

describe('doneByText', () => {
  it('viser ingenting når den ansvarlige gjorde det', () => {
    expect(doneByText(done({ assigned_member_id: 'leah' }), 'leah', nameOf)).toBeUndefined();
  });

  it('viser hvem når en annen gjorde det, og alltid i «Felles»', () => {
    expect(doneByText(done({ assigned_member_id: 'jesper' }), 'jesper', nameOf)).toBe('Gjort av Leah');
    expect(doneByText(done({}), SHARED_KEY, nameOf)).toBe('Gjort av Leah');
  });
});

describe('canUndo', () => {
  const adult = { now: NOW, isAdult: true, userId: 'user-voksen' };

  it('kan angre den siste avkrysningen innen 10 minutter', () => {
    expect(canUndo(done({}), adult)).toBe(true);
  });

  it('kan ikke angre etter 10 minutter', () => {
    const old = done({ completed_at: new Date(NOW - UNDO_WINDOW_MS - 1000).toISOString() });
    expect(canUndo(old, adult)).toBe(false);
  });

  it('kan ikke angre en eldre avkrysning på samme oppgave', () => {
    expect(canUndo(done({ is_latest: false }), adult)).toBe(false);
  });

  it('barn kan bare angre det de selv registrerte', () => {
    expect(canUndo(done({}), { now: NOW, isAdult: false, userId: 'user-leah' })).toBe(true);
    expect(canUndo(done({ recorded_by: 'user-voksen' }), { now: NOW, isAdult: false, userId: 'user-leah' })).toBe(false);
  });
});
