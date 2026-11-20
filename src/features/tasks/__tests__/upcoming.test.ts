import { addDays } from '../../../lib/dates';
import type { Occurrence, Task } from '../types';
import {
  canCompleteEarly,
  CHILD_UPCOMING_DAYS,
  isFrequent,
  UPCOMING_DAYS,
  buildUpcoming,
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

const run = (
  occ: Occurrence[],
  tasks: Task[],
  opts: {
    hideFrequent?: boolean;
    hideDaily?: boolean;
    includeSharedYear?: boolean;
    windowDays?: number;
    memberId?: string | null;
  } = {},
) => {
  const { memberId = 'leah', ...rest } = opts;
  return buildUpcoming(occ, tasks, memberId, TODAY, { windowDays: UPCOMING_DAYS, ...rest });
};

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

describe('buildUpcoming', () => {
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

  it('skjuler bare daglige med hideDaily (familieskjermen): ukentlige vises én gang', () => {
    const daily = task({ id: 'd', recurrence_unit: 'day', recurrence_every: 1 });
    const weekly = task({ id: 'w', recurrence_unit: 'week', recurrence_every: 1, next_due_on: '2026-11-19' });
    const occ = [...every('d', 1, CHILD_UPCOMING_DAYS), ...every('w', 7, CHILD_UPCOMING_DAYS)];
    const result = run(occ, [daily, weekly], { hideDaily: true, windowDays: CHILD_UPCOMING_DAYS });
    expect(result.repeating.map((r) => [r.task.id, r.nextOn])).toEqual([['w', '2026-11-19']]);
    expect(result.groups).toEqual([]);
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

describe('buildUpcoming: sirkel for tidlig avkrysning', () => {
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

describe('buildUpcoming: hele husstanden (memberId null)', () => {
  it('tar med alle personer og felles, men ikke jobber', () => {
    const occ = [
      { task_id: 'mine', due_on: '2026-11-20' },
      { task_id: 'shared', due_on: '2026-11-21' },
      { task_id: 'other', due_on: '2026-11-22' },
      { task_id: 'job', due_on: '2026-11-23' },
    ];
    const tasks = [
      task({ id: 'mine' }),
      task({ id: 'shared', assigned_member_id: null }),
      task({ id: 'other', assigned_member_id: 'noah' }),
      task({ id: 'job', recurrence_type: 'job' }),
    ];
    const ids = run(occ, tasks, { memberId: null }).groups.flatMap((g) => g.items.map((i) => i.task.id));
    expect(ids).toEqual(['mine', 'shared', 'other']);
  });

  it('skjuler hyppige oppgaver med hideFrequent', () => {
    const result = run(every('w', 7), [task({ id: 'w', recurrence_unit: 'week', recurrence_every: 1 })], {
      memberId: null,
      hideFrequent: true,
    });
    expect(result.repeating).toEqual([]);
    expect(result.groups).toEqual([]);
  });
});

describe('buildUpcoming: månedsoppgaver (årshjulet)', () => {
  const month = (overrides: Partial<Task>) =>
    task({ recurrence_unit: 'year', recurrence_every: 1, month_day: null, postponed_to: null, ...overrides });

  it('neste måned havner i nextMonth, ikke i ukene', () => {
    const t = month({ id: 'm', month: 12, next_due_on: '2026-12-01' });
    const result = run([{ task_id: 'm', due_on: '2026-12-01' }], [t]);
    expect(result.groups).toEqual([]);
    expect(result.nextMonth.map((i) => [i.task.id, i.dueOn, i.checkable])).toEqual([['m', '2026-12-01', true]]);
  });

  it('måneder lenger fram utelates', () => {
    const t = month({ id: 'jan', month: 1, next_due_on: '2027-01-01' });
    const result = run([{ task_id: 'jan', due_on: '2027-01-01' }], [t]);
    expect(result.groups).toEqual([]);
    expect(result.nextMonth).toEqual([]);
  });

  it('en utsatt månedsoppgave vises på datoen som en vanlig rad', () => {
    const t = month({ id: 'p', month: 11, next_due_on: '2026-12-05', postponed_to: '2026-12-05' });
    const result = run([{ task_id: 'p', due_on: '2026-12-05' }], [t]);
    expect(result.nextMonth).toEqual([]);
    expect(result.groups.flatMap((g) => g.items.map((i) => i.dueOn))).toEqual(['2026-12-05']);
  });

  it('årlig oppgave med fast dag er ikke en månedsoppgave', () => {
    const t = month({ id: 'd', month: 12, month_day: 10 });
    const result = run([{ task_id: 'd', due_on: '2026-12-10' }], [t]);
    expect(result.nextMonth).toEqual([]);
    expect(result.groups).toHaveLength(1);
  });

  it('felles månedsoppgaver er med for hele husstanden, sortert på tittel', () => {
    const a = month({ id: 'a', title: 'Sjekke brannvarslere', assigned_member_id: null });
    const b = month({ id: 'b', title: 'Rense sluk', assigned_member_id: 'noah' });
    const occ = [
      { task_id: 'a', due_on: '2026-12-01' },
      { task_id: 'b', due_on: '2026-12-01' },
    ];
    expect(run(occ, [a, b], { memberId: null }).nextMonth.map((i) => i.task.id)).toEqual(['b', 'a']);
    expect(run(occ, [a, b]).nextMonth).toEqual([]);
  });
});

describe('buildUpcoming: årshjul-oppgaver i personvisningen', () => {
  const year = { recurrence_type: 'calendar', recurrence_unit: 'year', recurrence_every: 1 } as const;
  const tasks = [
    task({ id: 'egen-årlig', ...year, month: 12, month_day: 1, season_start_month: null }),
    task({ id: 'felles-årlig', ...year, month: 12, month_day: 5, assigned_member_id: null, season_start_month: null }),
    task({ id: 'felles-måned', ...year, month: 12, month_day: null, assigned_member_id: null, season_start_month: null }),
    task({ id: 'felles-halvår', recurrence_type: 'interval', recurrence_unit: 'month', recurrence_every: 6, assigned_member_id: null, season_start_month: null }),
    task({ id: 'felles-uke', recurrence_unit: 'week', recurrence_every: 1, assigned_member_id: null, season_start_month: null }),
    task({ id: 'ola-årlig', ...year, month: 12, month_day: 2, assigned_member_id: 'ola', season_start_month: null }),
  ];
  const occ: Occurrence[] = [
    { task_id: 'egen-årlig', due_on: '2026-12-01' },
    { task_id: 'felles-årlig', due_on: '2026-12-05' },
    { task_id: 'felles-måned', due_on: '2026-12-01' },
    { task_id: 'felles-halvår', due_on: '2026-12-10' },
    { task_id: 'felles-uke', due_on: '2026-11-26' },
    { task_id: 'ola-årlig', due_on: '2026-12-02' },
  ];
  const ids = (r: ReturnType<typeof run>) => r.groups.flatMap((g) => g.items.map((i) => i.task.id));

  it('egen årlig oppgave med fast dato kommer i «Kommende» (som i dag)', () => {
    expect(ids(run(occ, tasks))).toEqual(['egen-årlig']);
  });

  it('includeSharedYear: felles årshjul med dato og «Neste måned», ikke felles hverdag eller andres', () => {
    const result = run(occ, tasks, { includeSharedYear: true });
    expect(ids(result)).toEqual(['egen-årlig', 'felles-årlig', 'felles-halvår']);
    expect(result.nextMonth.map((i) => i.task.id)).toEqual(['felles-måned']);
  });

  it('uten includeSharedYear (barn): ingen felles', () => {
    const result = run(occ, tasks);
    expect(result.nextMonth).toEqual([]);
  });

  it('«Alle» (memberId null) er uendret: alt er med', () => {
    expect(ids(run(occ, tasks, { memberId: null }))).toEqual([
      'felles-uke',
      'egen-årlig',
      'ola-årlig',
      'felles-årlig',
      'felles-halvår',
    ]);
  });
});
