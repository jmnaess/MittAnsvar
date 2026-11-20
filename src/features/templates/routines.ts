// «Forslag til hverdagen» (steg 16): daglige, ukentlige og månedlige rutinemaler.
// Ren logikk, så den kan testes uten React Native. Se docs/DATABASE.md §4.
import type { Member } from '../household/types';
import { describeRecurrence, isSeasonal } from '../tasks/recurrence';
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

// ---------------------------------------------------------------------------
// Hyppighet: endres per forslag før det legges til. Malen er standard og endres aldri.
// ---------------------------------------------------------------------------

/** Gjentakelsen en rutine kan ha: fast kalender hver dag, uke eller måned. */
export type RoutineRecurrence = Pick<Task, 'recurrence_unit' | 'recurrence_every' | 'weekdays' | 'month_day'>;

export type FrequencyOption = { key: string; label: string; recurrence: RoutineRecurrence };

/** Gjentakelsen til en mal eller en oppgave, bare kolonnene en rutine bruker. */
export function routineRecurrence(r: RoutineRecurrence): RoutineRecurrence {
  return {
    recurrence_unit: r.recurrence_unit,
    recurrence_every: r.recurrence_every,
    weekdays: r.weekdays,
    month_day: r.month_day,
  };
}

/** Lik nøkkel = lik gjentakelse. */
export function frequencyKey(r: RoutineRecurrence): string {
  return [r.recurrence_unit, r.recurrence_every, (r.weekdays ?? []).join(','), r.month_day ?? ''].join(':');
}

/** «Hver dag», «Annenhver søndag», «Den 1. hver måned». */
export function recurrenceLabel(r: RoutineRecurrence): string {
  return describeRecurrence({
    recurrence_type: 'calendar',
    ...routineRecurrence(r),
    month: null,
    job_repeats: false,
    season_start_month: null,
    season_end_month: null,
  });
}

const SATURDAY = 6;

/**
 * Valgene i «Hvor ofte?»: malens egen hyppighet først (standard), så hver dag, hver uke,
 * annenhver uke og hver måned, uten duplikater. Ukene bruker malens ukedager (lørdag hvis malen
 * ikke er ukentlig), måneden malens dato (ellers den 1.).
 */
export function frequencyOptions(t: RoutineRecurrence): FrequencyOption[] {
  const weekdays = t.recurrence_unit === 'week' && t.weekdays?.length ? t.weekdays : [SATURDAY];
  const monthDay = t.recurrence_unit === 'month' && t.month_day ? t.month_day : 1;
  const candidates: RoutineRecurrence[] = [
    routineRecurrence(t),
    { recurrence_unit: 'day', recurrence_every: 1, weekdays: null, month_day: null },
    { recurrence_unit: 'week', recurrence_every: 1, weekdays, month_day: null },
    { recurrence_unit: 'week', recurrence_every: 2, weekdays, month_day: null },
    { recurrence_unit: 'month', recurrence_every: 1, weekdays: null, month_day: monthDay },
  ];
  const seen = new Set<string>();
  return candidates.flatMap((recurrence) => {
    const key = frequencyKey(recurrence);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ key, label: recurrenceLabel(recurrence), recurrence }];
  });
}

/** En valgt rad der hyppigheten er endret fra malens. */
export type RecurrenceOverride = { templateId: string; memberId: string | null; recurrence: RoutineRecurrence };

/**
 * De valgte radene med endret hyppighet. frequency har bare radene som er endret fra malen
 * (nøkkel = routineKey). Rader som ikke er valgt, tas ikke med.
 */
export function recurrenceOverrides(
  choices: RoutineChoice[],
  selected: Set<string>,
  frequency: Map<string, RoutineRecurrence>,
): RecurrenceOverride[] {
  return choices.flatMap((c) => {
    const recurrence = frequency.get(c.key);
    return selected.has(c.key) && recurrence
      ? [{ templateId: c.templateId, memberId: c.memberId, recurrence }]
      : [];
  });
}

// ---------------------------------------------------------------------------
// «Fjern»: et forslag som er lagt til, arkiveres og blir valgbart igjen.
// ---------------------------------------------------------------------------

/**
 * Oppgavene en «Lagt til»-rad står for. Barnemal: oppgaven til barnet. Felles mal: alle aktive
 * oppgaver fra malen, uansett hvem de er tildelt (samme regel som activeRoutineKeys).
 */
export function tasksForRoutine<T extends Pick<Task, 'id' | 'template_id' | 'assigned_member_id'>>(
  tasks: T[],
  templateId: string,
  memberId: string | null,
): T[] {
  return tasks.filter(
    (t) => t.template_id === templateId && (memberId === null || t.assigned_member_id === memberId),
  );
}

/**
 * Flytter et lagt til-forslag tilbake blant de valgbare. Felles: til shared i malens rekkefølge.
 * Barn: til templates hvis malen passer alderen, ellers til more (sortert etter alder).
 */
export function restoreSuggestion(
  s: RoutineSuggestions,
  templateId: string,
  memberId: string | null,
  order: TaskTemplate[],
): RoutineSuggestions {
  const inOrder = (list: TaskTemplate[]) =>
    order.filter((t) => list.some((x) => x.id === t.id));

  if (memberId === null) {
    const t = s.sharedAdded.find((x) => x.id === templateId);
    if (!t) return s;
    return {
      ...s,
      shared: inOrder([...s.shared, t]),
      sharedAdded: s.sharedAdded.filter((x) => x.id !== templateId),
    };
  }
  return {
    ...s,
    children: s.children.map((c) => {
      const t = c.member.id === memberId ? c.added.find((x) => x.id === templateId) : undefined;
      if (!t) return c;
      const fits = fitsAge(t, c.age);
      return {
        ...c,
        templates: fits ? inOrder([...c.templates, t]) : c.templates,
        more: fits ? c.more : byAge(inOrder([...c.more, t])),
        added: c.added.filter((x) => x.id !== templateId),
      };
    }),
  };
}
