// Hvilke grupper i «Oppgaver» som er åpne. Per enhet, ikke i databasen (samme lager som
// påminnelsene: secureStorage). Alle grupper er lukket til de åpnes.
//
// En liten modul med tilstand i minnet, så skjemaene kan åpne gruppen til oppgaven de nettopp
// lagret (openGroups), og skjermen oppdateres med en gang (useOpenGroups).

import { useEffect, useSyncExternalStore } from 'react';
import { secureStorage } from '../../lib/secureStorage';

const STORAGE_KEY = 'tasks.openGroups';

let current: ReadonlySet<string> = new Set();
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Leser det lagrede én gang. Grupper som er åpnet før lesingen er ferdig, beholdes.
 * Lagring venter alltid på lesingen, så den ikke skriver over det som var lagret.
 */
function load(): Promise<void> {
  loading ??= (async () => {
    try {
      const raw = await secureStorage.getItem(STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(saved)) {
        current = new Set([...saved.filter((k): k is string => typeof k === 'string'), ...current]);
        notify();
      }
    } catch {
      // Ødelagt verdi eller lesefeil: start med det som er åpnet nå.
    }
  })();
  return loading;
}

function emit(next: ReadonlySet<string>) {
  current = next;
  notify();
  load()
    .then(() => secureStorage.setItem(STORAGE_KEY, JSON.stringify([...current])))
    .catch(() => {
      // Klarer vi ikke å lagre, er gruppene bare lukket neste gang appen åpnes.
    });
}

/** Åpner gruppene (f.eks. gruppene en oppgave havner i etter lagring). */
export function openGroups(keys: string[]) {
  if (keys.every((k) => current.has(k))) return;
  emit(new Set([...current, ...keys]));
}

export function toggleGroup(key: string) {
  const next = new Set(current);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  emit(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Nøklene til de åpne gruppene. Oppdateres når de åpnes eller lukkes. */
export function useOpenGroups(): ReadonlySet<string> {
  useEffect(() => {
    load();
  }, []);
  return useSyncExternalStore(subscribe, () => current);
}
