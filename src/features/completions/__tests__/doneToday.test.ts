import type { TodayCompletion } from '../api';
import type { Member } from '../../household/types';
import {
  canUndo,
  doneByText,
  doneSectionKey,
  moreDoneA11yLabel,
  moreDoneText,
  progressText,
  reassignCandidates,
  visibleDone,
  SHARED_KEY,
  UNDO_WINDOW_MS,
} from '../doneToday';

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
    job_member_ids: [],
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

describe('reassignCandidates', () => {
  const people = [
    { id: 'mor', role: 'adult' },
    { id: 'leah', role: 'child' },
    { id: 'jesper', role: 'child' },
  ] as Member[];
  const ids = (list: Member[]) => list.map((m) => m.id);

  it('gir alle i husstanden for vanlige oppgaver', () => {
    expect(ids(reassignCandidates(done({}), people))).toEqual(['mor', 'leah', 'jesper']);
  });

  it('gir bare barna jobben gjelder', () => {
    const job = done({ recurrence_type: 'job', job_member_ids: ['jesper'] });
    expect(ids(reassignCandidates(job, people))).toEqual(['jesper']);
  });

  it('gir alle barna (ingen voksne) for en jobb uten liste', () => {
    const job = done({ recurrence_type: 'job', job_member_ids: [] });
    expect(ids(reassignCandidates(job, people))).toEqual(['leah', 'jesper']);
  });
});

describe('visibleDone', () => {
  // Utført for 1, 2, … minutter siden. Listen kommer eldste først, som fra databasen.
  const list = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      done({ id: `c${n - i}`, completed_at: new Date(NOW - (n - i) * 60_000).toISOString() }),
    );
  const ids = (cs: TodayCompletion[]) => cs.map((c) => c.id);

  it('gir ingenting når ingenting er gjort', () => {
    expect(visibleDone([], false)).toEqual({ shown: [], hiddenCount: 0 });
  });

  it('viser alle når det er 1 eller 2', () => {
    expect(visibleDone(list(1), false)).toEqual({ shown: list(1), hiddenCount: 0 });
    expect(ids(visibleDone(list(2), false).shown)).toEqual(['c1', 'c2']);
    expect(visibleDone(list(2), false).hiddenCount).toBe(0);
  });

  it('viser de 2 siste, nyeste først, og teller resten', () => {
    const { shown, hiddenCount } = visibleDone(list(5), false);
    expect(ids(shown)).toEqual(['c1', 'c2']);
    expect(hiddenCount).toBe(3);
  });

  it('viser alle nyeste først når listen er foldet ut', () => {
    const { shown, hiddenCount } = visibleDone(list(5), true);
    expect(ids(shown)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(hiddenCount).toBe(0);
  });

  it('endrer ikke listen den får', () => {
    const input = list(3);
    visibleDone(input, false);
    expect(ids(input)).toEqual(['c3', 'c2', 'c1']);
  });
});

describe('progressText', () => {
  it('gir utført av totalt', () => {
    expect(progressText(4, 3)).toBe('3 av 7');
  });

  it('gir alt gjort når ingen er igjen', () => {
    expect(progressText(0, 2)).toBe('2 av 2');
  });

  it('gir ingenting for et tomt kort', () => {
    expect(progressText(0, 0)).toBeUndefined();
  });
});

describe('moreDoneText og moreDoneA11yLabel', () => {
  it('bruker samme korte tekst for 1 og flere', () => {
    expect(moreDoneText(1)).toBe('1 til gjort i dag');
    expect(moreDoneText(4)).toBe('4 til gjort i dag');
  });

  it('bøyer «oppgave» for skjermleser', () => {
    expect(moreDoneA11yLabel(1)).toBe('Vis 1 oppgave til som er gjort i dag');
    expect(moreDoneA11yLabel(4)).toBe('Vis 4 oppgaver til som er gjort i dag');
  });
});
