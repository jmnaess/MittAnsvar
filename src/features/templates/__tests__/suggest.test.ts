import type { Task } from '../../tasks/types';
import { groupByMonth, isOwnYearlyTask } from '../suggest';
import type { TaskTemplate } from '../types';

const template = (id: string, month: number) => ({ id, month, title: id }) as TaskTemplate;

const task = (overrides: Partial<Task>) =>
  ({
    id: 't',
    title: 'Oppgave',
    template_id: null,
    recurrence_type: 'calendar',
    recurrence_unit: 'year',
    month: 10,
    month_day: null,
    ...overrides,
  }) as Task;

describe('isOwnYearlyTask', () => {
  it('tar med egne årlige oppgaver, med og uten dag', () => {
    expect(isOwnYearlyTask(task({}))).toBe(true);
    expect(isOwnYearlyTask(task({ month_day: 15 }))).toBe(true);
  });

  it('tar ikke med oppgaver fra maler (de vises som malen)', () => {
    expect(isOwnYearlyTask(task({ template_id: 'gutters' }))).toBe(false);
  });

  it('tar ikke med ukentlige oppgaver eller «hvert år etter sist utført»', () => {
    expect(isOwnYearlyTask(task({ recurrence_unit: 'week', month: null }))).toBe(false);
    expect(isOwnYearlyTask(task({ recurrence_type: 'interval', month: null }))).toBe(false);
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
