import type { Member } from '../../household/types';
import {
  activeRoutineKeys,
  byAge,
  childAge,
  childHeading,
  defaultSelection,
  fitsAge,
  frequencyKey,
  frequencyLevel,
  frequencyOptions,
  isRoutineTemplate,
  recurrenceLabel,
  recurrenceOverrides,
  restoreSuggestion,
  routineChoices,
  routineFromSchedule,
  routineKey,
  routineSections,
  sharedHeading,
  suggestRoutines,
  tasksForRoutine,
  toActivation,
  type RoutineRecurrence,
} from '../routines';
import { suggestAfterProfileChange, suggestForHousehold, type SuggestionHousehold } from '../suggest';
import type { TaskTemplate } from '../types';

const template = (id: string, overrides: Partial<TaskTemplate> = {}) =>
  ({
    id,
    title: id,
    audience: 'any',
    min_age: null,
    max_age: null,
    reward_nok: null,
    suggested_by_default: true,
    household_types: null,
    housing_types: null,
    requires: null,
    recurrence_type: 'calendar',
    recurrence_unit: 'week',
    recurrence_every: 1,
    weekdays: [6],
    month: null,
    month_day: null,
    season_start_month: null,
    season_end_month: null,
    ...overrides,
  }) as TaskTemplate;

const member = (id: string, role: 'adult' | 'child', birth_year: number | null = null) =>
  ({ id, role, birth_year, display_name: id }) as Member;

const household = { type: 'family', housing_type: 'house', sewage_type: null } as SuggestionHousehold;
const none = { templates: new Set<string>(), pairs: new Set<string>() };
const YEAR = 2026;

describe('isRoutineTemplate', () => {
  it('dag, uke og måned er rutiner', () => {
    expect(isRoutineTemplate(template('a', { recurrence_unit: 'day', weekdays: null }))).toBe(true);
    expect(isRoutineTemplate(template('b'))).toBe(true);
    expect(isRoutineTemplate(template('c', { recurrence_unit: 'month', weekdays: null, month_day: 1 }))).toBe(true);
  });

  it('årsmaler, sesongmaler og intervallmaler er ikke rutiner', () => {
    expect(isRoutineTemplate(template('a', { recurrence_unit: 'year', month: 3 }))).toBe(false);
    expect(isRoutineTemplate(template('b', { season_start_month: 5, season_end_month: 9 }))).toBe(false);
    expect(isRoutineTemplate(template('c', { recurrence_type: 'interval' }))).toBe(false);
  });
});

describe('alder', () => {
  it('alderen er året nå minus fødselsåret', () => {
    expect(childAge(2017, YEAR)).toBe(9);
    expect(childAge(null, YEAR)).toBeNull();
  });

  it('fitsAge følger min_age og max_age, null = ingen grense', () => {
    const t = { min_age: 6, max_age: 8 };
    expect([5, 6, 8, 9].map((age) => fitsAge(t, age))).toEqual([false, true, true, false]);
    expect(fitsAge({ min_age: 13, max_age: null }, 17)).toBe(true);
    expect(fitsAge({ min_age: null, max_age: 5 }, 3)).toBe(true);
  });

  it('uten fødselsår passer bare maler uten aldersgrense', () => {
    expect(fitsAge({ min_age: null, max_age: null }, null)).toBe(true);
    expect(fitsAge({ min_age: 6, max_age: null }, null)).toBe(false);
  });

  it('overskriften har alder bare når den er kjent', () => {
    expect(childHeading('Leah', 9)).toBe('Leah, 9 år');
    expect(childHeading('Iver', null)).toBe('Iver');
  });
});

describe('suggestRoutines', () => {
  const templates = [
    template('bathroom'),
    template('couples', { household_types: ['couple', 'single'] }),
    template('table', { audience: 'child', min_age: 6, max_age: 12, suggested_by_default: false }),
    template('bed', { audience: 'child', min_age: 3 }),
    template('toys', { audience: 'child', max_age: 5 }),
    template('any-age', { audience: 'child', suggested_by_default: false }),
    template('wheel', { recurrence_unit: 'year', month: 3, weekdays: null }),
  ];
  const members = [member('adult', 'adult'), member('leah', 'child', 2017), member('iver', 'child', null)];

  it('felles: rutiner som passer husstandstypen, ikke barnemaler eller årsmaler', () => {
    const s = suggestRoutines(templates, household, members, none, YEAR);
    expect(s.shared.map((t) => t.id)).toEqual(['bathroom']);
  });

  it('per barn: maler som passer alderen først, resten under «Vis flere» sortert etter alder', () => {
    const s = suggestRoutines(templates, household, members, none, YEAR);
    expect(
      s.children.map((c) => [c.member.id, c.age, c.templates.map((t) => t.id), c.more.map((t) => t.id)]),
    ).toEqual([
      ['leah', 9, ['table', 'bed', 'any-age'], ['toys']],
      ['iver', null, ['any-age'], ['toys', 'bed', 'table']],
    ]);
  });

  it('byAge: min_age først (null = 0), så max_age (null = 18)', () => {
    const sorted = byAge([
      template('teen', { min_age: 13 }),
      template('six-twelve', { min_age: 6, max_age: 12 }),
      template('six-up', { min_age: 6 }),
      template('small', { max_age: 5 }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['small', 'six-twelve', 'six-up', 'teen']);
  });

  it('«Vis flere» kan velges, men er aldri avhuket', () => {
    const s = suggestRoutines(templates, household, members, none, YEAR);
    const keys = routineChoices(s).map((c) => c.key);
    expect(keys).toContain(routineKey('toys', 'leah'));
    expect(keys).toContain(routineKey('bed', 'iver'));
    const selected = defaultSelection(s);
    expect(selected.has(routineKey('toys', 'leah'))).toBe(false);
    expect(selected.has(routineKey('bed', 'iver'))).toBe(false);
  });

  it('lagt til uansett alder vises som lagt til, ikke under «Vis flere»', () => {
    const active = activeRoutineKeys([{ template_id: 'toys', assigned_member_id: 'leah' }]);
    const s = suggestRoutines(templates, household, members, active, YEAR);
    expect(s.children[0].added.map((t) => t.id)).toEqual(['toys']);
    expect(s.children[0].more).toEqual([]);
  });

  it('det som er aktivt, er lagt til og kan ikke velges (felles på mal, barn på mal + barn)', () => {
    const active = activeRoutineKeys([
      { template_id: 'bathroom', assigned_member_id: 'adult' },
      { template_id: 'bed', assigned_member_id: 'leah' },
      { template_id: null, assigned_member_id: 'iver' },
    ]);
    const s = suggestRoutines(templates, household, members, active, YEAR);
    expect(s.shared).toEqual([]);
    expect(s.sharedAdded.map((t) => t.id)).toEqual(['bathroom']);
    expect(s.children[0].templates.map((t) => t.id)).toEqual(['table', 'any-age']);
    expect(s.children[0].added.map((t) => t.id)).toEqual(['bed']);
    expect(s.children[1].added).toEqual([]);
    const keys = routineChoices(s).map((c) => c.key);
    expect(keys).not.toContain(routineKey('bathroom', null));
    expect(keys).not.toContain(routineKey('bed', 'leah'));
    expect(defaultSelection(s).has(routineKey('bed', 'leah'))).toBe(false);
  });

  it('avhuket fra start følger suggested_by_default', () => {
    const s = suggestRoutines(templates, household, members, none, YEAR);
    const selected = defaultSelection(s);
    expect(selected.has(routineKey('table', 'leah'))).toBe(false);
    expect(selected.has(routineKey('bed', 'leah'))).toBe(true);
    expect(selected.has(routineKey('bathroom', null))).toBe(true);
  });

  it('barn uten fødselsår følger også suggested_by_default', () => {
    const s = suggestRoutines(templates, household, members, none, YEAR);
    const selected = defaultSelection(s);
    expect(selected.has(routineKey('any-age', 'iver'))).toBe(false);
    expect(selected.has(routineKey('any-age', 'leah'))).toBe(false);
  });

  it('overskriften over felles forslag: «Forslag til deg» for enslige', () => {
    expect(sharedHeading('single')).toEqual({ title: 'Forslag til deg' });
    expect(sharedHeading('family').title).toBe('Felles');
  });

  it('toActivation gir like lange lister, felles = null', () => {
    const s = suggestRoutines(templates, household, members, none, YEAR);
    const choices = routineChoices(s);
    const { templateIds, memberIds } = toActivation(
      choices,
      new Set([routineKey('bathroom', null), routineKey('any-age', 'iver')]),
    );
    expect(templateIds).toEqual(['bathroom', 'any-age']);
    expect(memberIds).toEqual([null, 'iver']);
  });
});

describe('rutiner i årshjulet og hjemprofilen', () => {
  it('rutinemaler foreslås aldri i årshjulet eller fra hjemprofilen', () => {
    const templates = [template('routine'), template('child', { audience: 'child' })];
    expect(suggestForHousehold(templates, household)).toEqual([]);
    expect(suggestAfterProfileChange(templates, null, household, new Set())).toEqual([]);
  });
});

describe('frequencyLevel', () => {
  it('plasserer malene på stigen', () => {
    expect(frequencyLevel(template('a', { recurrence_unit: 'day', weekdays: null }))).toBe('daily');
    expect(frequencyLevel(template('a', { weekdays: [1, 2, 3, 4, 5] }))).toBe('daily');
    expect(frequencyLevel(template('a', { weekdays: [1, 3, 5] }))).toBe('twiceWeekly');
    expect(frequencyLevel(template('a', { weekdays: [6] }))).toBe('weekly');
    expect(frequencyLevel(template('a', { recurrence_every: 2, weekdays: [7] }))).toBe('biweekly');
    expect(
      frequencyLevel(template('a', { recurrence_unit: 'month', weekdays: null, month_day: 20 })),
    ).toBe('monthly');
  });

  it('intervall er ikke på stigen', () => {
    expect(
      frequencyLevel({ recurrence_type: 'interval', recurrence_unit: 'day', recurrence_every: 3, weekdays: null, month_day: null }),
    ).toBeNull();
  });
});

describe('frequencyOptions', () => {
  const labels = (t: TaskTemplate) => frequencyOptions(t).map((o) => o.label);
  const monthly = template('a', { recurrence_unit: 'month', weekdays: null, month_day: 20 });

  it('daglig mal: 2× i uka og hver uke, på lørdag', () => {
    expect(labels(template('a', { recurrence_unit: 'day', weekdays: null }))).toEqual([
      'Hver dag',
      'Hver tirsdag og lørdag',
      'Hver lørdag',
    ]);
  });

  it('hverdager (matpakke): regnes som daglig, ukene bruker malens første dag', () => {
    expect(labels(template('a', { weekdays: [1, 2, 3, 4, 5] }))).toEqual([
      'Hver mandag, tirsdag, onsdag, torsdag og fredag',
      'Hver mandag og torsdag',
      'Hver mandag',
    ]);
  });

  it('flere dager i uka (oppvask): hver dag og hver uke', () => {
    expect(labels(template('a', { weekdays: [1, 3, 5] }))).toEqual([
      'Hver mandag, onsdag og fredag',
      'Hver dag',
      'Hver mandag',
    ]);
  });

  it('ukentlig mal: 2× i uka og annenhver uke, aldri hver dag', () => {
    expect(labels(template('a', { weekdays: [7] }))).toEqual([
      'Hver søndag',
      'Hver onsdag og søndag',
      'Annenhver søndag',
    ]);
  });

  it('annenhver uke (sengetøy): hver uke og hver måned', () => {
    expect(labels(template('a', { recurrence_every: 2, weekdays: [7] }))).toEqual([
      'Annenhver søndag',
      'Hver søndag',
      'Den 1. hver måned',
    ]);
  });

  it('månedlig mal (regninger): malens dag 20, hver uke og annenhver uke, aldri hver dag', () => {
    expect(labels(monthly)).toEqual(['Den 20. hver måned', 'Hver lørdag', 'Annenhver lørdag']);
  });

  it('standarddatoen kommer fra malen, ikke fra dagens dato', () => {
    const day = (t: TaskTemplate) =>
      frequencyOptions(t).find((o) => o.recurrence.recurrence_unit === 'month')?.recurrence.month_day;
    expect(day(monthly)).toBe(20);
    expect(day(template('a', { recurrence_unit: 'month', weekdays: null, month_day: 5 }))).toBe(5);
    // En mal som ikke er månedlig, får den 1.
    expect(day(template('a', { recurrence_every: 2, weekdays: [7] }))).toBe(1);
  });

  it('standard er malens egen hyppighet', () => {
    const t = template('a', { recurrence_every: 2, weekdays: [7] });
    expect(frequencyOptions(t)[0].key).toBe(frequencyKey(t));
  });

  it('et valg fra «Annet …» legges til sist, uten duplikat', () => {
    const custom: RoutineRecurrence = {
      recurrence_type: 'calendar',
      recurrence_unit: 'month',
      recurrence_every: 1,
      weekdays: null,
      month_day: 25,
    };
    expect(frequencyOptions(monthly, custom).map((o) => o.label)).toEqual([
      'Den 20. hver måned',
      'Hver lørdag',
      'Annenhver lørdag',
      'Den 25. hver måned',
    ]);
    expect(frequencyOptions(monthly, monthly)).toHaveLength(3);
  });

  it('intervall: egen nøkkel og tekst', () => {
    const interval: RoutineRecurrence = {
      recurrence_type: 'interval',
      recurrence_unit: 'day',
      recurrence_every: 3,
      weekdays: null,
      month_day: null,
    };
    expect(frequencyKey(interval)).not.toBe(
      frequencyKey({ ...interval, recurrence_type: 'calendar' }),
    );
    expect(recurrenceLabel(interval)).toBe('3 dager etter sist');
  });
});

describe('routineFromSchedule', () => {
  const none = { month: null, job_repeats: false, once_on: null, season_start_month: null, season_end_month: null };

  it('fast kalender og intervall blir rutiner', () => {
    expect(
      routineFromSchedule({ recurrence_type: 'calendar', recurrence_unit: 'week', recurrence_every: 1, weekdays: [2, 5], month_day: null, ...none }),
    ).toEqual({ recurrence_type: 'calendar', recurrence_unit: 'week', recurrence_every: 1, weekdays: [2, 5], month_day: null });
    expect(
      routineFromSchedule({ recurrence_type: 'interval', recurrence_unit: 'month', recurrence_every: 2, weekdays: null, month_day: null, ...none }),
    ).not.toBeNull();
  });

  it('engangs, årlig, periode og ugyldig skjema gir null', () => {
    expect(routineFromSchedule(null)).toBeNull();
    expect(
      routineFromSchedule({ recurrence_type: 'once', recurrence_unit: null, recurrence_every: null, weekdays: null, month_day: null, ...none, once_on: '2026-11-20' }),
    ).toBeNull();
    expect(
      routineFromSchedule({ recurrence_type: 'calendar', recurrence_unit: 'year', recurrence_every: 1, weekdays: null, month_day: 1, ...none, month: 5 }),
    ).toBeNull();
    expect(
      routineFromSchedule({ recurrence_type: 'calendar', recurrence_unit: 'week', recurrence_every: 1, weekdays: [6], month_day: null, ...none, season_start_month: 5, season_end_month: 9 }),
    ).toBeNull();
  });
});

describe('recurrenceOverrides', () => {
  const monthly: RoutineRecurrence = { recurrence_type: 'calendar', recurrence_unit: 'month', recurrence_every: 1, weekdays: null, month_day: 1 };
  const choices = [
    { key: 'a:shared', templateId: 'a', memberId: null },
    { key: 'b:kid', templateId: 'b', memberId: 'kid' },
    { key: 'c:shared', templateId: 'c', memberId: null },
  ];

  it('bare valgte rader med endret hyppighet', () => {
    const frequency = new Map([['a:shared', monthly], ['b:kid', monthly]]);
    expect(recurrenceOverrides(choices, new Set(['a:shared', 'c:shared']), frequency)).toEqual([
      { templateId: 'a', memberId: null, recurrence: monthly },
    ]);
  });

  it('ingen endringer gir tom liste', () => {
    expect(recurrenceOverrides(choices, new Set(['a:shared']), new Map())).toEqual([]);
  });
});

describe('tasksForRoutine', () => {
  const tasks = [
    { id: '1', template_id: 'a', assigned_member_id: null },
    { id: '2', template_id: 'a', assigned_member_id: 'adult' },
    { id: '3', template_id: 'k', assigned_member_id: 'kid1' },
    { id: '4', template_id: 'k', assigned_member_id: 'kid2' },
    { id: '5', template_id: null, assigned_member_id: null },
  ];

  it('felles mal: alle oppgaver fra malen, uansett hvem', () => {
    expect(tasksForRoutine(tasks, 'a', null).map((t) => t.id)).toEqual(['1', '2']);
  });

  it('barnemal: bare oppgaven til barnet', () => {
    expect(tasksForRoutine(tasks, 'k', 'kid2').map((t) => t.id)).toEqual(['4']);
  });
});

describe('restoreSuggestion', () => {
  const a = template('a');
  const b = template('b');
  const young = template('young', { audience: 'child', min_age: 3, max_age: 6 });
  const old = template('old', { audience: 'child', min_age: 12, max_age: 18 });
  const order = [a, b, young, old];
  const kid = member('kid', 'child', YEAR - 5);

  it('felles: tilbake i shared på sin plass, borte fra sharedAdded', () => {
    const s = { shared: [b], sharedAdded: [a], children: [] };
    const next = restoreSuggestion(s, 'a', null, order);
    expect(next.shared.map((t) => t.id)).toEqual(['a', 'b']);
    expect(next.sharedAdded).toEqual([]);
  });

  it('barn: passer alderen → templates, ellers → more', () => {
    const s = {
      shared: [],
      sharedAdded: [],
      children: [{ member: kid, age: 5, templates: [], more: [], added: [young, old] }],
    };
    const afterYoung = restoreSuggestion(s, 'young', 'kid', order);
    expect(afterYoung.children[0].templates.map((t) => t.id)).toEqual(['young']);
    const afterOld = restoreSuggestion(afterYoung, 'old', 'kid', order);
    expect(afterOld.children[0].more.map((t) => t.id)).toEqual(['old']);
    expect(afterOld.children[0].added).toEqual([]);
  });
});

describe('routineSections', () => {
  const templates = [
    template('bathroom'),
    template('bed', { audience: 'child', min_age: 3 }),
  ];
  const members = [member('adult', 'adult'), member('leah', 'child', 2017), member('iver', 'child', 2019)];
  const kinds = (sections: ReturnType<typeof routineSections>) =>
    sections.map((x) => (x.kind === 'child' ? x.child.member.id : 'felles'));

  it('barna først, ett avsnitt per barn i medlemsrekkefølge, så felles', () => {
    const s = suggestRoutines(templates, household, members, none, YEAR);
    expect(kinds(routineSections(s))).toEqual(['leah', 'iver', 'felles']);
  });

  it('felles med bare «Lagt til» vises fortsatt', () => {
    const active = { templates: new Set(['bathroom']), pairs: new Set<string>() };
    const sections = routineSections(suggestRoutines(templates, household, members, active, YEAR));
    const shared = sections.find((x) => x.kind === 'shared');
    expect(shared && shared.kind === 'shared' && shared.added.map((t) => t.id)).toEqual(['bathroom']);
  });

  it('uten felles forslag: bare barna. Uten barn: bare felles', () => {
    const childOnly = suggestRoutines([template('bed', { audience: 'child' })], household, members, none, YEAR);
    expect(kinds(routineSections(childOnly))).toEqual(['leah', 'iver']);
    const adultsOnly = suggestRoutines(templates, household, [member('adult', 'adult')], none, YEAR);
    expect(kinds(routineSections(adultsOnly))).toEqual(['felles']);
  });
});
