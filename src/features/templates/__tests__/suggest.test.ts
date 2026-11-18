import type { Task } from '../../tasks/types';
import { groupByMonth, groupSuggestions, isOwnYearlyTask } from '../suggest';
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

  it('tar ikke med ukentlige oppgaver eller «hvert år etter sist utført»', () => {
    expect(isOwnYearlyTask(task({ recurrence_unit: 'week', month: null }), shown)).toBe(false);
    expect(isOwnYearlyTask(task({ recurrence_type: 'interval', month: null }), shown)).toBe(false);
  });
});

describe('groupByMonth', () => {
  it('gir tolv måneder med denne måneden først', () => {
    const sections = groupByMonth([], [], 11);
    expect(sections.map((s) => s.month)).toEqual([11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(sections[0].title).toBe('November');
  });

  it('legger egne oppgaver under riktig måned, etter malene og alfabetisk', () => {
    const sections = groupByMonth(
      [template('takrenner', 10)],
      [task({ id: 'b', title: 'Vaske vinduer', month: 10 }), task({ id: 'a', title: 'Bytte dekk', month: 10 }), task({ id: 'c', month: 4 })],
      10,
    );
    expect(sections[0].data.map((i) => i.key)).toEqual(['t-takrenner', 'o-a', 'o-b']);
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
    const sections = groupByMonth([lawn], [], 11);
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
    expect(groupByMonth([], [own], 11).find((s) => s.month === 10)!.data.map((i) => i.key)).toEqual(['o-filter']);
  });

  it('forslag: sesongmalen får egen rad med gjentakelse og periode', () => {
    expect(groupSuggestions([lawn])).toEqual([
      { key: 'lawn-mow', title: 'Klipp plenen', when: '1 uke etter sist · mai–sep', templateIds: ['lawn-mow'] },
    ]);
  });
});
