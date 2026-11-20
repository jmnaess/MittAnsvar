import type { Member } from '../../household/types';
import {
  activeRoutineKeys,
  byAge,
  childAge,
  childHeading,
  defaultSelection,
  fitsAge,
  isRoutineTemplate,
  routineChoices,
  routineKey,
  sharedHeading,
  suggestRoutines,
  toActivation,
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
