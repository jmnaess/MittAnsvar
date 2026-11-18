import { addDays } from '../../../lib/dates';
import type { Occurrence, Task } from '../types';
import {
  canCompleteEarly,
  CHILD_UPCOMING_DAYS,
  isFrequent,
  UPCOMING_DAYS,
  upcomingForMember,
  upcomingWindow,
} from '../upcoming';

const TODAY = '2026-11-18'; // onsdag, uke 47

const task = (overrides: Partial<Task>) =>
  ({ id: 't', title: 'Oppgave', assigned_member_id: 'leah', recurrence_type: 'calendar', ...overrides }) as Task;

/** Forekomster hver `step`. dag fra i morgen og ut vinduet. */
function every(taskId: string, step: number, windowDays = UPCOMING_DAYS): Occurrence[] {
  const out: Occurrence[] = [];
  for (let d = 1; d <= windowDays; d += step) out.push({ task_id: taskId, due_on: addDays(TODAY, d) });
  return out;
}

const run = (occ: Occurrence[], tasks: Task[], opts: { hideFrequent?: boolean; windowDays?: number } = {}) =>
  upcomingForMember(occ, tasks, 'leah', TODAY, { windowDays: UPCOMING_DAYS, ...opts });

describe('upcomingWindow', () => {
  it('starter i morgen', () => {
    expect(upcomingWindow(TODAY, UPCOMING_DAYS)).toEqual({ from: '2026-11-19', to: '2027-01-13' });
  });
});

describe('isFrequent', () => {
  it('8 uker: 8 forekomster er hyppig, 7 er ikke', () => {
    expect(isFrequent(8, UPCOMING_DAYS)).toBe(true);
    expect(isFrequent(7, UPCOMING_DAYS)).toBe(false);
  });

  it('2 uker: ukentlig (2 ganger) er hyppig, én gang er ikke', () => {
    expect(isFrequent(2, CHILD_UPCOMING_DAYS)).toBe(true);
    expect(isFrequent(1, CHILD_UPCOMING_DAYS)).toBe(false);
  });

  it('én forekomst er aldri hyppig, heller ikke i et kort vindu', () => {
    expect(isFrequent(1, 3)).toBe(false);
  });
});

describe('upcomingForMember', () => {
  it('viser en daglig oppgave én gang, med neste dato', () => {
    const daily = task({ id: 'd', title: 'Re opp sengen' });
    const result = run(every('d', 1), [daily]);
    expect(result.repeating).toEqual([{ task: daily, nextOn: '2026-11-19', checkable: false }]);
    expect(result.groups).toEqual([]);
  });

  it('slår sammen en ukentlig oppgave (8 ganger i 8 uker)', () => {
    const result = run(every('w', 7), [task({ id: 'w' })]);
    expect(result.repeating).toHaveLength(1);
    expect(result.groups).toEqual([]);
  });

  it('viser annenhver uke per forekomst', () => {
    const result = run(every('b', 14), [task({ id: 'b' })]);
    expect(result.repeating).toEqual([]);
    expect(result.groups.flatMap((g) => g.items.map((i) => i.dueOn))).toEqual([
      '2026-11-19', '2026-12-03', '2026-12-17', '2026-12-31',
    ]);
  });

  it('viser månedlige oppgaver per forekomst, med unike nøkler', () => {
    const occ = [
      { task_id: 'm', due_on: '2026-12-01' },
      { task_id: 'm', due_on: '2027-01-01' },
    ];
    const items = run(occ, [task({ id: 'm' })]).groups.flatMap((g) => g.items);
    expect(items.map((i) => i.key)).toEqual(['m:2026-12-01', 'm:2027-01-01']);
  });

  it('skjuler hyppige oppgaver helt med hideFrequent (barnets visning)', () => {
    const occ = [...every('d', 1, CHILD_UPCOMING_DAYS), { task_id: 'o', due_on: '2026-11-21' }];
    const result = run(occ, [task({ id: 'd' }), task({ id: 'o', title: 'Vaske bilen' })], {
      hideFrequent: true,
      windowDays: CHILD_UPCOMING_DAYS,
    });
    expect(result.repeating).toEqual([]);
    expect(result.groups.flatMap((g) => g.items.map((i) => i.task.id))).toEqual(['o']);
  });

  it('tar bare med personens egne oppgaver, ikke felles eller andres', () => {
    const occ = [
      { task_id: 'mine', due_on: '2026-11-20' },
      { task_id: 'shared', due_on: '2026-11-20' },
      { task_id: 'other', due_on: '2026-11-20' },
      { task_id: 'unknown', due_on: '2026-11-20' },
    ];
    const tasks = [
      task({ id: 'mine' }),
      task({ id: 'shared', assigned_member_id: null }),
      task({ id: 'other', assigned_member_id: 'noah' }),
    ];
    expect(run(occ, tasks).groups.flatMap((g) => g.items.map((i) => i.task.id))).toEqual(['mine']);
  });

  it('grupperer per uke med «Denne uken», «Neste uke» og ukenummer', () => {
    const occ = [
      { task_id: 'a', due_on: '2026-12-02' },
      { task_id: 'a', due_on: '2026-11-22' },
      { task_id: 'b', due_on: '2026-11-24' },
    ];
    const groups = run(occ, [task({ id: 'a' }), task({ id: 'b' })]).groups;
    expect(groups.map((g) => g.title)).toEqual([
      'Denne uken',
      'Neste uke',
      'Uke 49 · 30. nov.–6. des.',
    ]);
  });

  it('gir riktig ukenummer rundt årsskiftet', () => {
    const occ = [
      { task_id: 'a', due_on: '2026-12-31' },
      { task_id: 'b', due_on: '2027-01-05' },
    ];
    const groups = run(occ, [task({ id: 'a' }), task({ id: 'b' })]).groups;
    expect(groups.map((g) => g.title)).toEqual([
      'Uke 53 · 28. des.–3. jan.',
      'Uke 1 · 4.–10. jan.',
    ]);
  });

  it('sorterer på dato, så tittel, innen uken', () => {
    const occ = [
      { task_id: 'z', due_on: '2026-11-20' },
      { task_id: 'a', due_on: '2026-11-20' },
      { task_id: 'y', due_on: '2026-11-19' },
    ];
    const tasks = [task({ id: 'z', title: 'Å' }), task({ id: 'a', title: 'B' }), task({ id: 'y', title: 'C' })];
    expect(run(occ, tasks).groups[0].items.map((i) => i.task.id)).toEqual(['y', 'a', 'z']);
  });
});

describe('canCompleteEarly', () => {
  it('bare forekomsten som er oppgavens frist', () => {
    const t = task({ next_due_on: '2026-11-21', recurrence_unit: 'week', recurrence_every: 1 });
    expect(canCompleteEarly(t, '2026-11-21')).toBe(true);
    expect(canCompleteEarly(t, '2026-11-28')).toBe(false);
  });

  it('aldri daglige oppgaver, verken kalender eller intervall', () => {
    for (const recurrence_type of ['calendar', 'interval'] as const) {
      const t = task({ recurrence_type, recurrence_unit: 'day', recurrence_every: 1, next_due_on: '2026-11-19' });
      expect(canCompleteEarly(t, '2026-11-19')).toBe(false);
    }
  });

  it('annenhver dag er ikke daglig', () => {
    const t = task({ recurrence_unit: 'day', recurrence_every: 2, next_due_on: '2026-11-19' });
    expect(canCompleteEarly(t, '2026-11-19')).toBe(true);
  });

  it('aldri uten frist (jobb eller utført engangsoppgave)', () => {
    expect(canCompleteEarly(task({ next_due_on: null }), '2026-11-19')).toBe(false);
  });
});

describe('upcomingForMember: sirkel for tidlig avkrysning', () => {
  const checkable = (result: ReturnType<typeof run>) =>
    result.groups.flatMap((g) => g.items.map((i) => [i.dueOn, i.checkable]));

  it('første forekomst får sirkel, senere forekomster av samme oppgave ikke', () => {
    const t = task({ id: 'b', recurrence_unit: 'week', recurrence_every: 2, next_due_on: '2026-11-19' });
    expect(checkable(run(every('b', 14), [t]))).toEqual([
      ['2026-11-19', true],
      ['2026-12-03', false],
      ['2026-12-17', false],
      ['2026-12-31', false],
    ]);
  });

  it('oppgave med frist i dag (står i «I dag») gir ingen sirkel', () => {
    const t = task({ id: 'b', recurrence_unit: 'week', recurrence_every: 2, next_due_on: TODAY });
    expect(checkable(run(every('b', 14), [t])).every(([, c]) => c === false)).toBe(true);
  });

  it('forfalt oppgave gir ingen sirkel', () => {
    const t = task({ id: 'b', recurrence_unit: 'week', recurrence_every: 2, next_due_on: '2026-11-10' });
    expect(checkable(run(every('b', 14), [t])).every(([, c]) => c === false)).toBe(true);
  });

  it('engangsoppgave fram i tid får sirkel', () => {
    const t = task({ id: 'o', recurrence_type: 'once', next_due_on: '2026-11-25' });
    expect(checkable(run([{ task_id: 'o', due_on: '2026-11-25' }], [t]))).toEqual([['2026-11-25', true]]);
  });

  it('hyppig ukentlig oppgave får sirkel når neste dato er fristen', () => {
    const t = task({ id: 'w', recurrence_unit: 'week', recurrence_every: 1, next_due_on: '2026-11-19' });
    expect(run(every('w', 7), [t]).repeating[0].checkable).toBe(true);
  });

  it('hyppig ukentlig oppgave med frist i dag får ikke sirkel', () => {
    const t = task({ id: 'w', recurrence_unit: 'week', recurrence_every: 1, next_due_on: TODAY });
    expect(run(every('w', 7), [t]).repeating[0].checkable).toBe(false);
  });

  it('hyppig daglig oppgave får aldri sirkel', () => {
    const t = task({ id: 'd', recurrence_unit: 'day', recurrence_every: 1, next_due_on: '2026-11-19' });
    expect(run(every('d', 1), [t]).repeating[0].checkable).toBe(false);
  });
});
