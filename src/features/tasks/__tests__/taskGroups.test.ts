import type { Member } from '../../household/types';
import {
  describeTaskSchedule,
  filterTasks,
  groupByCategory,
  groupByPerson,
  groupKeysFor,
  JOBS_GROUP_KEY,
  matchesPerson,
  matchesSearch,
  SHARED_GROUP_KEY,
  sortByTitle,
  toListItems,
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

describe('groupByPerson', () => {
  it('medlemmene i rekkefølge, så Felles, så Ledige jobber, bare med oppgaver', () => {
    const groups = groupByPerson(
      [
        task({ title: 'Jobb', recurrence_type: 'job', job_member_ids: ['leah'] }),
        task({ title: 'Felles', assigned_member_id: null }),
        task({ title: 'Leahs', assigned_member_id: 'leah' }),
        task({ title: 'Mors', assigned_member_id: 'mor' }),
      ],
      members,
    );
    expect(groups.map((g) => g.key)).toEqual(['person:mor', 'person:leah', SHARED_GROUP_KEY, JOBS_GROUP_KEY]);
  });

  it('jobber står bare i Ledige jobber, ikke hos barnet', () => {
    const groups = groupByPerson([task({ recurrence_type: 'job', job_member_ids: ['leah'] })], members);
    expect(groups.map((g) => g.kind)).toEqual(['jobs']);
  });

  it('oppgave for et medlem som ikke finnes lenger, regnes som felles', () => {
    const groups = groupByPerson([task({ assigned_member_id: 'borte' })], members);
    expect(groups.map((g) => g.key)).toEqual([SHARED_GROUP_KEY]);
  });
});

describe('groupKeysFor', () => {
  it('kategori og person', () => {
    expect(groupKeysFor(task({ category: 'kitchen', assigned_member_id: 'leah' }))).toEqual([
      'category:kitchen',
      'person:leah',
    ]);
  });

  it('felles og jobb', () => {
    expect(groupKeysFor(task({ category: 'pets' }))).toEqual(['category:pets', SHARED_GROUP_KEY]);
    expect(groupKeysFor(task({ recurrence_type: 'job' }))).toEqual(['category:other', JOBS_GROUP_KEY]);
  });
});

describe('toListItems', () => {
  const groups = groupByCategory([
    task({ title: 'A', category: 'kitchen' }),
    task({ title: 'B', category: 'car' }),
  ]);

  it('lukkede grupper viser bare overskriften', () => {
    const items = toListItems(groups, new Set());
    expect(items.map((i) => i.type)).toEqual(['header', 'header']);
    expect(items.every((i) => i.type !== 'header' || !i.open)).toBe(true);
  });

  it('åpne grupper viser oppgavene', () => {
    const items = toListItems(groups, new Set(['category:car']));
    expect(items.map((i) => i.key)).toEqual(['category:kitchen', 'category:car', 'B']);
  });

  it('allOpen (søk) åpner alle', () => {
    expect(toListItems(groups, new Set(), true)).toHaveLength(4);
  });
});

describe('describeTaskSchedule', () => {
  it('gjentakende: gjentakelse og neste frist', () => {
    expect(describeTaskSchedule(task({ next_due_on: '2026-11-26' }), TODAY)).toBe('Hver torsdag · neste tor. 26. nov.');
  });

  it('frist i dag er ikke forfalt', () => {
    expect(describeTaskSchedule(task({ next_due_on: TODAY }), TODAY)).toBe('Hver torsdag · neste tor. 19. nov.');
  });

  it('forfalt', () => {
    expect(describeTaskSchedule(task({ next_due_on: '2026-11-12' }), TODAY)).toBe('Hver torsdag · Forfalt');
  });

  it('engangsoppgave: bare datoen, Forfalt eller Ferdig', () => {
    const once = { recurrence_type: 'once' as const, recurrence_unit: null, weekdays: null };
    expect(describeTaskSchedule(task({ ...once, next_due_on: '2026-11-20' }), TODAY)).toBe('fre. 20. nov.');
    expect(describeTaskSchedule(task({ ...once, next_due_on: '2026-11-18' }), TODAY)).toBe('Forfalt');
    expect(describeTaskSchedule(task({ ...once, next_due_on: null }), TODAY)).toBe('Ferdig');
  });

  it('månedsoppgave: måned og år, forfalt først etter månedsslutt', () => {
    const month = { recurrence_unit: 'year' as const, weekdays: null, month: 11, month_day: null };
    expect(describeTaskSchedule(task({ ...month, next_due_on: '2026-11-01' }), TODAY)).toBe(
      'I november hvert år · neste november 2026',
    );
    expect(describeTaskSchedule(task({ ...month, next_due_on: '2026-10-01' }), TODAY)).toBe(
      'I november hvert år · Forfalt',
    );
  });

  it('jobb: bare gjentakelsen', () => {
    expect(describeTaskSchedule(task({ recurrence_type: 'job', next_due_on: null }), TODAY)).toBe('Ledig jobb');
  });
});
