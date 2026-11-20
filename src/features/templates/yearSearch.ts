// Søk i «Årshjul»: husstandens årshjul-oppgaver og malene. Samme treffregel som i Hverdag
// (matchesSearch: tittelen inneholder søketeksten).
import { matchesSearch } from '../tasks/taskGroups';
import { isYearWheelTemplate, type MonthSection, yearSectionTitle } from './suggest';
import type { TaskTemplate } from './types';

/**
 * Månedene med treff, og bare radene som treffer. Tomt søk gir årshjulet som før (alle måneder).
 * Månedsoverskriften viser hvor treffet ligger.
 */
export function searchYearSections(sections: MonthSection[], query: string): MonthSection[] {
  if (query.trim() === '') return sections;
  return sections
    .map((section) => ({
      ...section,
      data: section.data.filter((item) =>
        matchesSearch(item.kind === 'own' ? item.task : item.template, query),
      ),
    }))
    .filter((section) => section.data.length > 0);
}

/** Et treff blant malene som ikke vises, med måneden det ligger i («Mars»). */
export type OtherTemplateHit = { template: TaskTemplate; sectionTitle: string };

/**
 * Årshjulsmaler som ikke vises fordi de ikke passer hjemprofilen, og som treffer søket.
 * Brukes bare når søket ikke gir treff i det som vises. Tomt søk gir ingen.
 */
export function otherYearTemplates(
  templates: TaskTemplate[],
  shownIds: Set<string>,
  query: string,
): OtherTemplateHit[] {
  if (query.trim() === '') return [];
  return templates
    .filter((t) => isYearWheelTemplate(t) && !shownIds.has(t.id) && matchesSearch(t, query))
    .map((template) => ({ template, sectionTitle: yearSectionTitle(template) }));
}
