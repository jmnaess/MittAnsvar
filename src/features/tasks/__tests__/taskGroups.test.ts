import type { Member } from '../../household/types';
import {
  bundleReward,
  bundleSchedule,
  bundleTasks,
  describeTaskSchedule,
  joinNames,
  sameTaskKey,
  filterTasks,
  groupByCategory,
  groupEveryday,
  groupKeysFor,
  matchesPerson,
  matchesSearch,
  sortByTitle,
  isTaskOverdue,
  withOpenState,
} from '../taskGroups';
import type { Task } from '../types';

const TODAY = '2026-11-19'; // torsdag

const task = (overrides: Partial<Task>) =>
  ({
    id: overrides.title ?? 't',
    title: 'Oppgave',
    category: 'other',
    assigned_member_id: null,
    recurrence_type: 'calendar',
    recurrence_unit: 'week',
    recurrence_every: 1,
    weekdays: [4],
    month_day: null,
    month: null,
    job_repeats: false,
    job_member_ids: [],
    season_start_month: null,
    season_end_month: null,
    next_due_on: TODAY,
    postponed_to: null,
    template_id: null,
    reward_nok: null,
    ...overrides,
  }) as Task;

const member = (id: string, role: Member['role']) =>
  ({ id, role, display_name: id, avatar: 'fox' }) as Member;

const mor = member('mor', 'adult');
const leah = member('leah', 'child');
const ola = member('ola', 'child');
const members = [mor, leah, ola];

const titles = (list: { title: string }[]) => list.map((t) => t.title);

describe('matchesSearch', () => {
  it('finner del av tittelen uten forskjell på store og små bokstaver', () => {
    expect(matchesSearch({ title: 'Tømme oppvaskmaskinen' }, 'OPPVASK')).toBe(true);
    expect(matchesSearch({ title: 'Tømme oppvaskmaskinen' }, '  tømme ')).toBe(true);
    expect(matchesSearch({ title: 'Støvsuge' }, 'Æ')).toBe(false);
  });

  it('tomt søk gir alle', () => {
    expect(matchesSearch({ title: 'Hva som helst' }, '   ')).toBe(true);
  });
});

describe('matchesPerson', () => {
  it('Alle (null) gir alt', () => {
    expect(matchesPerson(task({}), null, members)).toBe(true);
  });

  it('tildelt personen', () => {
    expect(matchesPerson(task({ assigned_member_id: 'leah' }), 'leah', members)).toBe(true);
    expect(matchesPerson(task({ assigned_member_id: 'ola' }), 'leah', members)).toBe(false);
  });

  it('felles vises bare under Alle', () => {
    expect(matchesPerson(task({ assigned_member_id: null }), 'leah', members)).toBe(false);
  });

  it('jobb: barna som kan ta den, tom liste = alle barna, aldri voksne', () => {
    const forLeah = task({ recurrence_type: 'job', job_member_ids: ['leah'] });
    const forAll = task({ recurrence_type: 'job', job_member_ids: [] });
    expect(matchesPerson(forLeah, 'leah', members)).toBe(true);
    expect(matchesPerson(forLeah, 'ola', members)).toBe(false);
    expect(matchesPerson(forAll, 'ola', members)).toBe(true);
    expect(matchesPerson(forAll, 'mor', members)).toBe(false);
  });
});

describe('filterTasks', () => {
  it('kombinerer søk og person', () => {
    const tasks = [
      task({ title: 'Rydde rommet', assigned_member_id: 'leah' }),
      task({ title: 'Rydde boden', assigned_member_id: 'mor' }),
      task({ title: 'Mate katten', assigned_member_id: 'leah' }),
    ];
    expect(titles(filterTasks(tasks, { query: 'rydde', personId: 'leah' }, members))).toEqual(['Rydde rommet']);
  });
});

describe('sortByTitle', () => {
  it('norsk alfabet: æ, ø og å sist', () => {
    const sorted = sortByTitle([{ title: 'Åpne' }, { title: 'Øke' }, { title: 'Ære' }, { title: 'Bake' }]);
    expect(titles(sorted)).toEqual(['Bake', 'Ære', 'Øke', 'Åpne']);
  });
});

describe('groupByCategory', () => {
  it('fast rekkefølge, bare kategorier med oppgaver, sortert på tittel', () => {
    const groups = groupByCategory([
      task({ title: 'Vinterdekk', category: 'car' }),
      task({ title: 'Vaske opp', category: 'kitchen' }),
      task({ title: 'Dekke bordet', category: 'kitchen' }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['category:kitchen', 'category:car']);
    expect(titles(groups[0].tasks)).toEqual(['Dekke bordet', 'Vaske opp']);
  });

  it('ukjent kategori havner i Annet', () => {
    const groups = groupByCategory([task({ title: 'Gammel', category: 'safety' })]);
    expect(groups.map((g) => g.key)).toEqual(['category:other']);
  });
});

describe('groupEveryday', () => {
  const job = (title: string, job_member_ids: string[] = []) =>
    task({ title, category: 'kitchen', recurrence_type: 'job', recurrence_unit: null, weekdays: null, job_member_ids });

  it('ekstrajobbene står ikke i kategoriene, men i en egen gruppe nederst', () => {
    const groups = groupEveryday([task({ title: 'Vaske opp', category: 'kitchen' }), job('Rydde boden'), job('Bære ved')]);
    expect(groups.map((g) => [g.key, g.kind, g.title])).toEqual([
      ['category:kitchen', 'category', 'Kjøkken'],
      ['jobs', 'jobs', 'Ekstrajobber'],
    ]);
    expect(titles(groups[0].tasks)).toEqual(['Vaske opp']);
    expect(titles(groups[1].tasks)).toEqual(['Bære ved', 'Rydde boden']);
  });

  it('ingen gruppe for ekstrajobber når det ikke finnes noen', () => {
    expect(groupEveryday([task({ title: 'Vaske opp', category: 'kitchen' })]).map((g) => g.key)).toEqual([
      'category:kitchen',
    ]);
  });

  it('personfilteret: et barn ser ekstrajobbene barnet kan ta', () => {
    const tasks = [task({ title: 'Mors', assigned_member_id: 'mor' }), job('For alle'), job('Bare Ola', ['ola'])];
    const groups = groupEveryday(filterTasks(tasks, { query: '', personId: 'leah' }, members));
    expect(groups.map((g) => g.key)).toEqual(['jobs']);
    expect(titles(groups[0].tasks)).toEqual(['For alle']);
  });
});

describe('groupKeysFor', () => {
  it('kategorien, eller Ekstrajobber for jobber', () => {
    expect(groupKeysFor(task({ category: 'kitchen', assigned_member_id: 'leah' }))).toEqual(['category:kitchen']);
    expect(groupKeysFor(task({ recurrence_type: 'job' }))).toEqual(['jobs']);
  });
});

describe('withOpenState', () => {
  const groups = groupByCategory([
    task({ title: 'A', category: 'kitchen' }),
    task({ title: 'B', category: 'car' }),
  ]);

  it('lukket til de åpnes', () => {
    const list = withOpenState(groups, new Set(['category:car']));
    expect(list.map((g) => [g.key, g.open])).toEqual([
      ['category:kitchen', false],
      ['category:car', true],
    ]);
  });

  it('allOpen (søk) åpner alle', () => {
    expect(withOpenState(groups, new Set(), true).every((g) => g.open)).toBe(true);
  });
});

describe('describeTaskSchedule', () => {
  it('gjentakende: gjentakelse og neste frist', () => {
    expect(describeTaskSchedule(task({ next_due_on: '2026-11-26' }), TODAY)).toBe('Hver torsdag · neste tor. 26. nov.');
  });

  it('frist i dag er ikke forfalt', () => {
    expect(describeTaskSchedule(task({ next_due_on: TODAY }), TODAY)).toBe('Hver torsdag · neste tor. 19. nov.');
  });

  it('forfalt: bare gjentakelsen, Forfalt er en merkelapp', () => {
    expect(describeTaskSchedule(task({ next_due_on: '2026-11-12' }), TODAY)).toBe('Hver torsdag');
  });

  it('engangsoppgave: bare datoen, tom når forfalt, eller Ferdig', () => {
    const once = { recurrence_type: 'once' as const, recurrence_unit: null, weekdays: null };
    expect(describeTaskSchedule(task({ ...once, next_due_on: '2026-11-20' }), TODAY)).toBe('fre. 20. nov.');
    expect(describeTaskSchedule(task({ ...once, next_due_on: '2026-11-18' }), TODAY)).toBe('');
    expect(describeTaskSchedule(task({ ...once, next_due_on: null }), TODAY)).toBe('Ferdig');
  });

  it('månedsoppgave: måned og år, forfalt først etter månedsslutt', () => {
    const month = { recurrence_unit: 'year' as const, weekdays: null, month: 11, month_day: null };
    expect(describeTaskSchedule(task({ ...month, next_due_on: '2026-11-01' }), TODAY)).toBe(
      'I november hvert år · neste november 2026',
    );
    expect(describeTaskSchedule(task({ ...month, next_due_on: '2026-10-01' }), TODAY)).toBe(
      'I november hvert år',
    );
  });

  it('jobb: bare gjentakelsen', () => {
    expect(describeTaskSchedule(task({ recurrence_type: 'job', next_due_on: null }), TODAY)).toBe('Ekstrajobb');
  });
});

describe('isTaskOverdue', () => {
  it('fristen er passert', () => {
    expect(isTaskOverdue(task({ next_due_on: '2026-11-12' }), TODAY)).toBe(true);
    expect(isTaskOverdue(task({ next_due_on: TODAY }), TODAY)).toBe(false);
  });

  it('månedsoppgave: forfalt først etter månedsslutt', () => {
    const month = { recurrence_unit: 'year' as const, weekdays: null, month: 11, month_day: null };
    expect(isTaskOverdue(task({ ...month, next_due_on: '2026-11-01' }), TODAY)).toBe(false);
    expect(isTaskOverdue(task({ ...month, next_due_on: '2026-10-01' }), TODAY)).toBe(true);
  });

  it('daglige oppgaver er aldri forfalt, ukentlige kan være det', () => {
    const daily = { recurrence_unit: 'day' as const, recurrence_every: 1, weekdays: null };
    expect(isTaskOverdue(task({ ...daily, next_due_on: '2026-11-12' }), TODAY)).toBe(false);
    const workdays = { weekdays: [1, 2, 3, 4, 5], next_due_on: '2026-11-12' };
    expect(isTaskOverdue(task(workdays), TODAY)).toBe(false);
    expect(isTaskOverdue(task({ weekdays: [1, 4], next_due_on: '2026-11-12' }), TODAY)).toBe(true);
  });

  it('jobber og fullførte engangsoppgaver er aldri forfalt', () => {
    expect(isTaskOverdue(task({ recurrence_type: 'job', next_due_on: '2026-11-01' }), TODAY)).toBe(false);
    const once = { recurrence_type: 'once' as const, recurrence_unit: null, weekdays: null };
    expect(isTaskOverdue(task({ ...once, next_due_on: null }), TODAY)).toBe(false);
  });
});

describe('sameTaskKey', () => {
  it('felles og jobber slås aldri sammen', () => {
    expect(sameTaskKey(task({ assigned_member_id: null }))).toBeNull();
    expect(sameTaskKey(task({ recurrence_type: 'job', assigned_member_id: null }))).toBeNull();
  });

  it('samme mal er lik, uansett tittel', () => {
    const a = task({ title: 'Re opp senga', template_id: 'm1', assigned_member_id: 'leah' });
    const b = task({ title: 'Re opp sengen', template_id: 'm1', assigned_member_id: 'ola' });
    expect(sameTaskKey(a)).toBe(sameTaskKey(b));
  });

  it('uten mal: tittel uten forskjell på store og små bokstaver, kategori og gjentakelse', () => {
    const a = task({ title: 'Re opp senga', assigned_member_id: 'leah' });
    expect(sameTaskKey(task({ title: ' re opp Senga', assigned_member_id: 'ola' }))).toBe(sameTaskKey(a));
    expect(sameTaskKey(task({ title: 'Re opp senga', assigned_member_id: 'ola', category: 'kitchen' }))).not.toBe(
      sameTaskKey(a),
    );
    expect(sameTaskKey(task({ title: 'Re opp senga', assigned_member_id: 'ola', weekdays: [1] }))).not.toBe(
      sameTaskKey(a),
    );
  });

  it('frist og lønn teller ikke, men engangsoppgaver må ha samme dato', () => {
    const a = task({ assigned_member_id: 'leah', next_due_on: '2026-11-19', reward_nok: 10 });
    expect(sameTaskKey(task({ assigned_member_id: 'ola', next_due_on: '2026-11-26', reward_nok: 20 }))).toBe(
      sameTaskKey(a),
    );
    const once = (date: string) =>
      task({ assigned_member_id: 'ola', recurrence_type: 'once', recurrence_unit: null, next_due_on: date });
    expect(sameTaskKey(once('2026-11-19'))).toBe(sameTaskKey({ ...once('2026-11-19'), assigned_member_id: 'leah' }));
    expect(sameTaskKey(once('2026-11-19'))).not.toBe(sameTaskKey(once('2026-11-20')));
  });
});

describe('bundleTasks', () => {
  const t = (id: string, title: string, assigned: string | null) =>
    ({ ...task({ title, assigned_member_id: assigned }), id }) as Task;

  it('like oppgaver blir én rad, med personene i medlemsrekkefølge', () => {
    const tasks = [t('1', 'Re opp senga', 'ola'), t('2', 'Re opp senga', 'leah'), t('3', 'Tannpuss', 'ola')];
    const bundles = bundleTasks(tasks, members);
    expect(bundles.map((b) => b.tasks.map((x) => x.id))).toEqual([['2', '1'], ['3']]);
  });

  it('felles slås ikke sammen, og ikke to like for samme person', () => {
    const tasks = [t('1', 'Støvsuge', null), t('2', 'Støvsuge', null), t('3', 'Lese', 'leah'), t('4', 'Lese', 'leah')];
    expect(bundleTasks(tasks, members).map((b) => b.tasks.length)).toEqual([1, 1, 1, 1]);
  });

  it('nøkkelen er den første oppgavens id, så den er unik i gruppen', () => {
    const tasks = [t('a', 'Lese', 'leah'), t('b', 'Lese', 'leah'), t('c', 'Lese', 'ola')];
    expect(bundleTasks(tasks, members).map((b) => b.key)).toEqual(['a', 'b']);
  });
});

describe('bundleReward', () => {
  it('ingen, lik eller spenn', () => {
    expect(bundleReward([task({}), task({ reward_nok: 0 })])).toBeNull();
    expect(bundleReward([task({ reward_nok: 10 }), task({ reward_nok: 10 })])).toBe('10 kr');
    expect(bundleReward([task({ reward_nok: 20 }), task({ reward_nok: 10 }), task({})])).toBe('10–20 kr');
  });
});

describe('bundleSchedule', () => {
  it('nærmeste frist, og forfalt hvis én er forfalt', () => {
    const later = task({ next_due_on: '2026-12-03' });
    const sooner = task({ next_due_on: '2026-11-26' });
    expect(bundleSchedule([later, sooner], TODAY)).toEqual({
      schedule: 'Hver torsdag · neste tor. 26. nov.',
      overdue: false,
    });
    expect(bundleSchedule([later, task({ next_due_on: '2026-11-12' })], TODAY).overdue).toBe(true);
  });

  it('én oppgave: det samme som describeTaskSchedule', () => {
    const one = task({ next_due_on: '2026-11-26' });
    expect(bundleSchedule([one], TODAY).schedule).toBe(describeTaskSchedule(one, TODAY));
  });
});

describe('joinNames', () => {
  it('én, to og flere', () => {
    expect(joinNames(['Leah'])).toBe('Leah');
    expect(joinNames(['Leah', 'Ola'])).toBe('Leah og Ola');
    expect(joinNames(['Leah', 'Ola', 'Mor'])).toBe('Leah, Ola og Mor');
  });
});
