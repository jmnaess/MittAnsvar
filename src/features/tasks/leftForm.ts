// Når et redigeringsskjema lukkes fordi oppgaven er borte, legger skjemaet igjen en beskjed her.
// Skjermen man kommer tilbake til («I dag» eller «Oppgaver»), henter den når den får fokus
// (takeLeftForm) og viser toasten selv: «Angre» etter egen sletting, eller en kort melding når
// en annen voksen har slettet oppgaven. Samme mønster som revealSaved/takeReveal i tasksSegment.ts.

export type LeftForm =
  | { kind: 'deleted'; task: { id: string; title: string }; at: number }
  | { kind: 'gone'; message: string; at: number };

let pending: LeftForm | null = null;

/** Oppgaven ble slettet fra skjemaet. Skjermen bak viser «Angre». */
export function markDeleted(task: { id: string; title: string }, now = Date.now()) {
  pending = { kind: 'deleted', task: { id: task.id, title: task.title }, at: now };
}

/** Oppgaven forsvant mens skjemaet var åpent (slettet av en annen). */
export function markGone(message: string, now = Date.now()) {
  pending = { kind: 'gone', message, at: now };
}

/** Henter og tømmer det ventende. null når ingenting er lagt igjen. */
export function takeLeftForm(): LeftForm | null {
  const left = pending;
  pending = null;
  return left;
}
