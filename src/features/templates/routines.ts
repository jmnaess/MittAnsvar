// «Forslag til hverdagen» (steg 16): daglige, ukentlige og månedlige rutinemaler.
// Ren logikk, så den kan testes uten React Native. Se docs/DATABASE.md §4.
import type { Member } from '../household/types';
import { isSeasonal } from '../tasks/recurrence';
import type { Task } from '../tasks/types';
import { fitsHousehold, type SuggestionHousehold } from './suggest';
import type { TaskTemplate } from './types';

/**
 * Rutinemal: fast kalender hver dag, uke eller måned, uten periode. Årsmaler, sesongmaler og
 * intervallmaler er årshjulet og hjemprofilen, aldri rutiner.
 */
export function isRoutineTemplate(
  t: Pick<TaskTemplate, 'recurrence_type' | 'recurrence_unit' | 'season_start_month'>,
): boolean {
  return (
    t.recurrence_type === 'calendar' &&
    (t.recurrence_unit === 'day' || t.recurrence_unit === 'week' || t.recurrence_unit === 'month') &&
    !isSeasonal(t)
  );
}

/** Alderen barnet har eller fyller i år. null = fødselsår ikke lagt inn. */
export function childAge(birthYear: number | null, year: number): number | null {
  return birthYear === null ? null : year - birthYear;
}

/**
 * Passer barnemalen barnet? Med alder: mellom min_age og max_age (null = ingen grense).
 * Uten alder: bare maler uten aldersgrense. Alderen sorterer forslagene, den skjuler dem ikke:
 * resten ligger under «Vis flere forslag».
 */
export function fitsAge(t: Pick<TaskTemplate, 'min_age' | 'max_age'>, age: number | null): boolean {
  if (age === null) return t.min_age === null && t.max_age === null;
  return (t.min_age === null || age >= t.min_age) && (t.max_age === null || age <= t.max_age);
}

/** Sortert etter alder: min_age (null = 0), så max_age (null = 18). Ellers samme rekkefølge. */
export function byAge(templates: TaskTemplate[]): TaskTemplate[] {
  return [...templates].sort(
    (a, b) => (a.min_age ?? 0) - (b.min_age ?? 0) || (a.max_age ?? 18) - (b.max_age ?? 18),
  );
}

/** Nøkkelen for en aktiv rutine: malen og barnet, eller malen alene for felles. */
export function routineKey(templateId: string, memberId: string | null): string {
  return `${templateId}:${memberId ?? 'shared'}`;
}

/**
 * Det husstanden allerede har fra maler. Felles maler regnes som aktive uansett hvem oppgaven
 * er tildelt (samme regel som activate_templates).
 */
export function activeRoutineKeys(
  tasks: Pick<Task, 'template_id' | 'assigned_member_id'>[],
): { templates: Set<string>; pairs: Set<string> } {
  const templates = new Set<string>();
  const pairs = new Set<string>();
  for (const t of tasks) {
    if (!t.template_id) continue;
    templates.add(t.template_id);
    if (t.assigned_member_id) pairs.add(routineKey(t.template_id, t.assigned_member_id));
  }
  return { templates, pairs };
}

/**
 * templates: passer alderen, vises først. more: de andre barnemalene, sortert etter alder, under
 * «Vis flere forslag» (alle, når fødselsår mangler). added: maler barnet allerede har, uansett
 * alder, vist dempet nederst («Lagt til»). Kan ikke velges.
 */
export type ChildSuggestions = {
  member: Member;
  age: number | null;
  templates: TaskTemplate[];
  more: TaskTemplate[];
  added: TaskTemplate[];
};

/** sharedAdded: felles maler husstanden allerede har, vist dempet nederst. Kan ikke velges. */
export type RoutineSuggestions = {
  shared: TaskTemplate[];
  sharedAdded: TaskTemplate[];
  children: ChildSuggestions[];
};

/**
 * Forslagene: felles maler (any/adult) som passer husstanden, og alle barnemaler per barn, delt
 * i de som passer alderen og resten. Det som er aktivt, havner i sharedAdded/added i stedet, så
 * det aldri kan velges igjen.
 */
export function suggestRoutines(
  templates: TaskTemplate[],
  household: SuggestionHousehold,
  members: Member[],
  active: ReturnType<typeof activeRoutineKeys>,
  year: number,
): RoutineSuggestions {
  const routines = templates.filter((t) => isRoutineTemplate(t) && fitsHousehold(t, household));
  const sharedAll = routines.filter((t) => t.audience !== 'child');
  const childTemplates = routines.filter((t) => t.audience === 'child');
  const children = members
    .filter((m) => m.role === 'child')
    .map((member) => {
      const age = childAge(member.birth_year, year);
      const isAdded = (t: TaskTemplate) => active.pairs.has(routineKey(t.id, member.id));
      const open = childTemplates.filter((t) => !isAdded(t));
      return {
        member,
        age,
        templates: open.filter((t) => fitsAge(t, age)),
        more: byAge(open.filter((t) => !fitsAge(t, age))),
        added: childTemplates.filter(isAdded),
      };
    });
  return {
    shared: sharedAll.filter((t) => !active.templates.has(t.id)),
    sharedAdded: sharedAll.filter((t) => active.templates.has(t.id)),
    children,
  };
}

/** Én rad i forslagslisten. key = routineKey. */
export type RoutineChoice = { key: string; templateId: string; memberId: string | null };

/** Alle radene i forslagene, i rekkefølgen de vises. */
export function routineChoices(s: RoutineSuggestions): RoutineChoice[] {
  return [
    ...s.shared.map((t) => ({ key: routineKey(t.id, null), templateId: t.id, memberId: null })),
    ...s.children.flatMap((c) =>
      [...c.templates, ...c.more].map((t) => ({
        key: routineKey(t.id, c.member.id),
        templateId: t.id,
        memberId: c.member.id,
      })),
    ),
  ];
}

/**
 * Radene som er avhuket fra start: suggested_by_default blant de som passer alderen.
 * «Vis flere forslag» er aldri avhuket.
 */
export function defaultSelection(s: RoutineSuggestions): Set<string> {
  return new Set([
    ...s.shared.filter((t) => t.suggested_by_default).map((t) => routineKey(t.id, null)),
    ...s.children.flatMap((c) =>
      c.templates.filter((t) => t.suggested_by_default).map((t) => routineKey(t.id, c.member.id)),
    ),
  ]);
}

/** Overskriften over de felles forslagene. En enslig har ingen å dele med. */
export function sharedHeading(type: SuggestionHousehold['type']): { title: string; description?: string } {
  return type === 'single'
    ? { title: 'Forslag til deg' }
    : { title: 'Felles', description: 'Hvem som helst i husstanden kan gjøre disse.' };
}

/** De valgte radene som argumenter til activate_templates (like lange lister). */
export function toActivation(
  choices: RoutineChoice[],
  selected: Set<string>,
): { templateIds: string[]; memberIds: (string | null)[] } {
  const picked = choices.filter((c) => selected.has(c.key));
  return { templateIds: picked.map((c) => c.templateId), memberIds: picked.map((c) => c.memberId) };
}

/** «Leah, 9 år» eller bare «Leah» uten fødselsår. */
export function childHeading(name: string, age: number | null): string {
  return age === null ? name : `${name}, ${age} år`;
}
