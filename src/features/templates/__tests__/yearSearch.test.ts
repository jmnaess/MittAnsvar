import type { Task } from '../../tasks/types';
import { groupByMonth, yearSectionTitle } from '../suggest';
import type { TaskTemplate } from '../types';
import { otherYearTemplates, searchYearSections } from '../yearSearch';

// Årlig mal i en måned, eller (month null) et langt intervall under «Med jevne mellomrom».
const template = (id: string, title: string, month: number | null, overrides: Partial<TaskTemplate> = {}) =>
  ({
    id,
    title,
    month,
    season_start_month: null,
    season_end_month: null,
    recurrence_type: month === null ? 'interval' : 'calendar',
    recurrence_unit: month === null ? 'month' : 'year',
    recurrence_every: month === null ? 3 : 1,
    ...overrides,
  }) as TaskTemplate;

const ownTask = (id: string, title: string, month: number) =>
  ({
    id,
    title,
    template_id: null,
    recurrence_type: 'calendar',
    recurrence_unit: 'year',
    recurrence_every: 1,
    month,
    month_day: null,
    season_start_month: null,
    season_end_month: null,
  }) as Task;

const gutters = template('gutters', 'Rens takrenner', 10);
const smoke = template('smoke', 'Test røykvarsler', 12);
const filter = template('filter', 'Bytt ventilasjonsfilter', null);
const sections = groupByMonth([gutters, smoke, filter], [ownTask('own', 'Vask takrenne-rist', 4)]);

describe('searchYearSections', () => {
  it('tomt søk (også bare mellomrom) gir årshjulet som før', () => {
    expect(searchYearSections(sections, '')).toBe(sections);
    expect(searchYearSections(sections, '   ')).toBe(sections);
  });

  it('finner maler og egne oppgaver, uten forskjell på store og små bokstaver', () => {
    const hits = searchYearSections(sections, 'TAKRENNE');
    expect(hits.map((s) => s.title)).toEqual(['April', 'Oktober']);
    expect(hits[0].data).toEqual([expect.objectContaining({ kind: 'own' })]);
    expect(hits[1].data).toEqual([expect.objectContaining({ kind: 'template', template: gutters })]);
  });

  it('fjerner måneder uten treff og tar med «Med jevne mellomrom»', () => {
    const hits = searchYearSections(sections, 'filter');
    expect(hits.map((s) => s.title)).toEqual(['Med jevne mellomrom']);
  });

  it('ingen treff gir ingen måneder', () => {
    expect(searchYearSections(sections, 'pipe')).toEqual([]);
  });

  it('endrer ikke de opprinnelige seksjonene', () => {
    searchYearSections(sections, 'røyk');
    expect(sections.find((s) => s.month === 10)?.data).toHaveLength(1);
  });
});

describe('otherYearTemplates', () => {
  const chimney = template('chimney', 'Feie pipa', 9);
  const weekly = template('weekly', 'Feie trappa', null, { recurrence_type: 'calendar', recurrence_unit: 'week' });
  const all = [gutters, smoke, filter, chimney, weekly];
  const shownIds = new Set(['gutters', 'smoke', 'filter']);

  it('gir årshjulsmaler som ikke vises og treffer søket, med måneden', () => {
    expect(otherYearTemplates(all, shownIds, 'feie')).toEqual([{ template: chimney, sectionTitle: 'September' }]);
  });

  it('tar ikke med maler som allerede vises', () => {
    expect(otherYearTemplates(all, shownIds, 'takrenner')).toEqual([]);
  });

  it('tomt søk gir ingen', () => {
    expect(otherYearTemplates(all, shownIds, ' ')).toEqual([]);
  });
});

describe('yearSectionTitle', () => {
  it('gir måneden, periodens første måned eller «Med jevne mellomrom»', () => {
    expect(yearSectionTitle({ month: 3, season_start_month: null })).toBe('Mars');
    expect(yearSectionTitle({ month: null, season_start_month: 5 })).toBe('Mai');
    expect(yearSectionTitle({ month: null, season_start_month: null })).toBe('Med jevne mellomrom');
  });
});
