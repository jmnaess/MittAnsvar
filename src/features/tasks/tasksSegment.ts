// Hvilket segment i «Oppgaver» som er valgt («Hverdag» eller «Årshjul»). Per enhet, i samme
// lager som åpne grupper (openGroups.ts). Standard er Hverdag.
//
// Etter lagring i et skjema som er åpnet fra «Oppgaver» (parameteren from=tasks, FROM_TASKS),
// husker modulen hvor oppgaven havnet (revealSaved). «Oppgaver» bytter dit når skjermen får fokus
// igjen (takeReveal), og sier fra hvis det er et annet segment. Skjemaer åpnet fra «I dag» sender
// ikke parameteren, så de rører ikke «Oppgaver».

import { useEffect, useSyncExternalStore } from 'react';
import { secureStorage } from '../../lib/secureStorage';
import { yearSectionKey } from '../templates/suggest';
import { type TaskSection, taskSection } from './section';
import type { TaskInput } from './types';

const STORAGE_KEY = 'tasks.segment';

/** Parameteren skjemaene får når de åpnes fra «Oppgaver». */
export const FROM_TASKS = { from: 'tasks' } as const;

/** Er skjemaet åpnet fra «Oppgaver»? */
export function isFromTasks(params: { from?: string | string[] }): boolean {
  return params.from === FROM_TASKS.from;
}

let current: TaskSection = 'everyday';
let changedBeforeLoad = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function isSegment(value: unknown): value is TaskSection {
  return value === 'everyday' || value === 'year';
}

/** Leser det lagrede én gang. Et valg som er gjort før lesingen er ferdig, beholdes. */
function load(): Promise<void> {
  loading ??= (async () => {
    try {
      const saved = await secureStorage.getItem(STORAGE_KEY);
      if (!changedBeforeLoad && isSegment(saved)) {
        current = saved;
        notify();
      }
    } catch {
      // Lesefeil: start på Hverdag.
    }
  })();
  return loading;
}

/** Segmentet som er valgt nå (utenfor React, f.eks. i en fokus-effekt). */
export function getTasksSegment(): TaskSection {
  return current;
}

export function setTasksSegment(segment: TaskSection) {
  if (segment === current) return;
  changedBeforeLoad = true;
  current = segment;
  notify();
  load()
    .then(() => secureStorage.setItem(STORAGE_KEY, current))
    .catch(() => {
      // Klarer vi ikke å lagre, starter fanen på Hverdag neste gang.
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Segmentet som er valgt. Oppdateres når det endres. */
export function useTasksSegment(): TaskSection {
  useEffect(() => {
    load();
  }, []);
  return useSyncExternalStore(subscribe, () => current);
}

/** Hvor en lagret oppgave havnet: segmentet, og i Årshjul seksjonen (måneden eller «Med jevne mellomrom»). */
export type Reveal = { segment: TaskSection; sectionKey: string | null; at: number };

let pending: Reveal | null = null;

/** Kalles etter lagring i et skjema fra «Oppgaver». Med flere oppgaver (flere måneder) gjelder den første. */
export function revealSaved(inputs: TaskInput[], now = Date.now()) {
  const first = inputs[0];
  if (!first) return;
  const segment = taskSection(first);
  pending = { segment, sectionKey: segment === 'year' ? yearSectionKey(first) : null, at: now };
}

/** Henter og tømmer det ventende. null når ingenting er lagret. */
export function takeReveal(): Reveal | null {
  const reveal = pending;
  pending = null;
  return reveal;
}
