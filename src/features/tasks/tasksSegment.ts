// Hvilket segment i «Oppgaver» som er valgt («Hverdag» eller «Årshjul»). Per enhet, i samme
// lager som åpne grupper (openGroups.ts). Standard er Hverdag.
//
// Etter lagring husker modulen også hvor oppgaven havnet (revealSaved). «Oppgaver» bytter dit
// neste gang skjermen får fokus (takeReveal), og sier fra hvis det er et annet segment.

import { useEffect, useSyncExternalStore } from 'react';
import { secureStorage } from '../../lib/secureStorage';
import { yearSectionKey } from '../templates/suggest';
import { type TaskSection, taskSection } from './section';
import type { TaskInput } from './types';

const STORAGE_KEY = 'tasks.segment';
/** Eldre lagringer vises ikke. Da ble oppgaven lagret et annet sted (f.eks. fra «I dag»). */
const REVEAL_MAX_AGE_MS = 30_000;

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

/** Kalles etter lagring. Med flere oppgaver (flere måneder) gjelder den første. */
export function revealSaved(inputs: TaskInput[], now = Date.now()) {
  const first = inputs[0];
  if (!first) return;
  const segment = taskSection(first);
  pending = { segment, sectionKey: segment === 'year' ? yearSectionKey(first) : null, at: now };
}

/** Henter og tømmer det ventende. null når ingenting er lagret de siste 30 sekundene. */
export function takeReveal(now = Date.now()): Reveal | null {
  const reveal = pending;
  pending = null;
  return reveal && now - reveal.at <= REVEAL_MAX_AGE_MS ? reveal : null;
}
