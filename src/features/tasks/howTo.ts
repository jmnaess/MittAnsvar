// «Slik gjør du»: forklaringen bak (i)-ikonet og øverst på redigeringsskjermen.
// Ren logikk, så den kan testes uten React Native.
import { isRoutineTemplate } from '../templates/routines';
import type { TaskTemplate } from '../templates/types';

/** Det howTo trenger fra malen. Familieskjermen får akkurat dette fra get_family_board. */
export type HowToTemplate = Pick<
  TaskTemplate,
  'description' | 'source_name' | 'source_url' | 'recurrence_type' | 'recurrence_unit' | 'season_start_month'
>;

/** Det howTo trenger fra oppgaven. Gjentakelsen brukes når malen ikke er kjent. */
export type HowToTask = Pick<HowToTemplate, 'recurrence_type' | 'recurrence_unit' | 'season_start_month'> & {
  title: string;
  description?: string | null;
  template_id?: string | null;
};

export type HowToSource = { name: string; url: string | null };

export type HowTo = { title: string; text: string; source: HowToSource | null };

function sourceOf(t: Pick<HowToTemplate, 'source_name' | 'source_url'>): HowToSource | null {
  return t.source_name ? { name: t.source_name, url: t.source_url ?? null } : null;
}

/**
 * En mal i forslagslistene. Rutinemaler («Re opp senga») får ikke ikon: de forklarer seg selv.
 * Årshjul, hjemprofil, intervall og sesong får det.
 */
export function howToForTemplate(t: HowToTemplate & { title: string }): HowTo | null {
  const text = t.description.trim();
  if (!text || isRoutineTemplate(t)) return null;
  return { title: t.title, text, source: sourceOf(t) };
}

/**
 * En oppgave. null = ingen forklaring (ingen beskrivelse), eller ikke ikon (oppgaven er laget fra
 * en rutinemal). Oppgaver uten mal får ikon når de har beskrivelse.
 *
 * template: malen oppgaven er laget fra, hvis den er kjent. Ukjent mal (template_id satt, men malen
 * er ikke hentet ennå eller er deaktivert): oppgavens egen gjentakelse avgjør om den er en rutine.
 * Familieskjermen får malen uten template_id.
 *
 * always: redigeringsskjermen viser beskrivelsen for alle oppgaver, også rutiner.
 *
 * Kilden vises bare når beskrivelsen fortsatt er lik malens, så en endret tekst aldri får en kilde
 * den ikke har.
 */
export function howToForTask(
  task: HowToTask,
  template: HowToTemplate | null | undefined,
  { always = false }: { always?: boolean } = {},
): HowTo | null {
  const text = task.description?.trim() ?? '';
  if (!text) return null;
  const fromTemplate = !!template || !!task.template_id;
  if (!always && fromTemplate && isRoutineTemplate(template ?? task)) return null;
  const source = template && template.description.trim() === text ? sourceOf(template) : null;
  return { title: task.title, text, source };
}
