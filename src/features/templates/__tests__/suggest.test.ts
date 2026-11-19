import type { Task } from '../../tasks/types';
import { describeEvery, groupByMonth, groupSuggestions, isOwnYearlyTask, suggestForHousehold } from '../suggest';
import type { TaskTemplate } from '../types';

const template = (id: string, month: number | null, overrides: Partial<TaskTemplate> = {}) =>
  ({ id, month, title: id, season_start_month: null, season_end_month: null, ...overrides }) as TaskTemplate;

const task = (overrides: Partial<Task>) =>
  ({
    id: 't',
    title: 'Oppgave',
    template_id: null,
    recurrence_type: 'calendar',
    recurrence_unit: 'year',
    month: 10,
    month_day: null,
    season_start_month: null,
    season_end_month: null,
    ...overrides,
  }) as Task;

// Malene som vises i årshjulet.
const shown = new Set(['gutters']);

describe('isOwnYearlyTask', () => {
  it('tar med egne årlige oppgaver, med og uten dag', () => {
    expect(isOwnYearlyTask(task({}), shown)).toBe(true);
    expect(isOwnYearlyTask(task({ month_day: 15 }), shown)).toBe(true);
  });

  it('tar ikke med oppgaver fra maler (de vises som malen)', () => {
    expect(isOwnYearlyTask(task({ template_id: 'gutters' }), shown)).toBe(false);
  });

  it('tar med oppgaver fra maler som ikke vises (f.eks. deaktivert), så de ikke forsvinner', () => {
    expect(isOwnYearlyTask(task({ template_id: 'ventilation-filter-spring' }), shown)).toBe(true);
  });

  it('tar ikke med ukentlige oppgaver eller korte intervaller', () => {
    expect(isOwnYearlyTask(task({ recurrence_unit: 'week', month: null }), shown)).toBe(false);
    expect(
      isOwnYearlyTask(task({ recurrence_type: 'interval', recurrence_unit: 'month', recurrence_every: 2, month: null }), shown),
    ).toBe(false);
  });

  it('tar med lange intervaller («hvert år etter sist utført», «3 måneder etter sist»)', () => {
    expect(isOwnYearlyTask(task({ recurrence_type: 'interval', recurrence_every: 1, month: null }), shown)).toBe(true);
    expect(
      isOwnYearlyTask(task({ recurrence_type: 'interval', recurrence_unit: 'month', recurrence_every: 3, month: null }), shown),
    ).toBe(true);
  });
});

describe('groupByMonth', () => {
  it('gir januar til desember, så «Med jevne mellomrom»', () => {
    const sections = groupByMonth([], []);
    expect(sections.map((s) => s.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, null]);
    expect(sections[0].title).toBe('Januar');
    expect(sections[12].title).toBe('Med jevne mellomrom');
  });

  it('legger lange intervaller i «Med jevne mellomrom», malene først', () => {
    const filter = template('filter', null, {
      recurrence_type: 'interval',
      recurrence_unit: 'month',
      recurrence_every: 6,
    });
    const own = task({ id: 'sluk', recurrence_type: 'interval', recurrence_unit: 'month', recurrence_every: 3, month: null });
    const sections = groupByMonth([filter], [own]);
    expect(sections[12].data.map((i) => i.key)).toEqual(['t-filter', 'o-sluk']);
    expect(sections.slice(0, 12).every((s) => s.data.length === 0)).toBe(true);
  });

  it('legger egne oppgaver under riktig måned, etter malene og alfabetisk', () => {
    const sections = groupByMonth(
      [template('takrenner', 10)],
      [task({ id: 'b', title: 'Vaske vinduer', month: 10 }), task({ id: 'a', title: 'Bytte dekk', month: 10 }), task({ id: 'c', month: 4 })],
    );
    expect(sections[9].data.map((i) => i.key)).toEqual(['t-takrenner', 'o-a', 'o-b']);
    expect(sections.find((s) => s.month === 4)!.data.map((i) => i.key)).toEqual(['o-c']);
  });
});

describe('sesongoppgaver i årshjulet', () => {
  const lawn = template('lawn-mow', null, {
    title: 'Klipp plenen',
    recurrence_type: 'interval',
    recurrence_unit: 'week',
    recurrence_every: 1,
    season_start_month: 5,
    season_end_month: 9,
  });

  it('en sesongmal står under periodens første måned', () => {
    const sections = groupByMonth([lawn], []);
    expect(sections.find((s) => s.month === 5)!.data.map((i) => i.key)).toEqual(['t-lawn-mow']);
    expect(sections.filter((s) => s.data.length > 0)).toHaveLength(1);
  });

  it('egne oppgaver med periode er med, i periodens første måned (også over nyttår)', () => {
    const own = task({
      id: 'filter',
      recurrence_type: 'interval',
      recurrence_unit: 'week',
      month: null,
      season_start_month: 10,
      season_end_month: 4,
    });
    expect(isOwnYearlyTask(own, shown)).toBe(true);
    expect(groupByMonth([], [own]).find((s) => s.month === 10)!.data.map((i) => i.key)).toEqual(['o-filter']);
  });

  it('forslag: sesongmalen får egen rad med gjentakelse og periode', () => {
    expect(groupSuggestions([lawn])).toEqual([
      { key: 'lawn-mow', title: 'Klipp plenen', when: '1 uke etter sist · mai–sep', templateIds: ['lawn-mow'] },
    ]);
  });
});

describe('lange intervallmaler i årshjulet', () => {
  const household = { type: 'family', housing_type: 'house' } as Parameters<typeof suggestForHousehold>[1];
  const interval = (id: string, unit: 'day' | 'week' | 'month' | 'year', every: number) =>
    template(id, null, {
      recurrence_type: 'interval',
      recurrence_unit: unit,
      recurrence_every: every,
      household_types: null,
      housing_types: null,
      requires: null,
    });

  it('tar med intervaller på minst ca. 3 måneder, ikke kortere', () => {
    const ids = suggestForHousehold(
      [interval('kort', 'week', 8), interval('lang', 'month', 3), interval('aar', 'year', 1), interval('dager', 'day', 90)],
      household,
    ).map((t) => t.id);
    expect(ids).toEqual(['lang', 'aar', 'dager']);
  });

  it('samme regel som for oppgaver: en årlig mal uten måned vises som mal i «Med jevne mellomrom»', () => {
    const yearly = template('uten-maaned', null, {
      recurrence_type: 'calendar',
      recurrence_unit: 'year',
      recurrence_every: 1,
      household_types: null,
      housing_types: null,
      requires: null,
    });
    expect(suggestForHousehold([yearly], household).map((t) => t.id)).toEqual(['uten-maaned']);
    expect(groupByMonth([yearly], [])[12].data.map((i) => i.key)).toEqual(['t-uten-maaned']);
  });
});

describe('describeEvery', () => {
  const today = '2026-11-19';

  it('gjentakelse og måneden for neste frist', () => {
    expect(describeEvery({ recurrence_unit: 'month', recurrence_every: 3 }, '2027-03-01', today)).toBe(
      'Hver 3. måned · neste i mars',
    );
    expect(describeEvery({ recurrence_unit: 'year', recurrence_every: 1 }, '2026-11-30', today)).toBe(
      'Hvert år · neste i november',
    );
  });

  it('tar med året når fristen er mer enn tolv måneder fram eller passert', () => {
    expect(describeEvery({ recurrence_unit: 'year', recurrence_every: 2 }, '2028-03-01', today)).toBe(
      'Hvert 2. år · neste i mars 2028',
    );
    expect(describeEvery({ recurrence_unit: 'week', recurrence_every: 13 }, '2026-10-01', today)).toBe(
      'Hver 13. uke · neste i oktober 2026',
    );
  });

  it('uten frist bare gjentakelsen', () => {
    expect(describeEvery({ recurrence_unit: 'day', recurrence_every: 90 }, null, today)).toBe('Hver 90. dag');
  });
});
