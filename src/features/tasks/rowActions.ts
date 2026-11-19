// Menyen voksne får ved trykk på en oppgaverad i «I dag» og personvisningen.
// Her bestemmes hvilke valg en rad får. Selve menyen er components/TaskRowMenu.tsx.

import type { Task } from './types';

export type RowAction = 'postpone' | 'pickDoer' | 'remove' | 'reassign' | 'edit' | 'cancel';

/** Det menyen må vite om raden. */
export type RowFacts =
  /** Åpen oppgave i dag. canPickDoer: husstanden har flere enn én person. */
  | { kind: 'open'; canPickDoer: boolean }
  /** «Kommende». checkable: nærmeste forekomst, som kan krysses av tidlig. */
  | { kind: 'upcoming'; checkable: boolean; canPickDoer: boolean }
  /** Utført i dag. canReassign: det finnes en annen å flytte til. canEdit: oppgaven er aktiv. */
  | { kind: 'done'; canReassign: boolean; canEdit: boolean }
  /** «Gjort siste 3 dager». Kan ikke rettes (bare dagens avkrysninger kan det). */
  | { kind: 'recent'; canEdit: boolean };

export const ROW_ACTION_LABELS: Record<RowAction, string> = {
  postpone: 'Utsett til …',
  pickDoer: 'Velg hvem som gjorde det',
  remove: 'Ikke gjort',
  reassign: 'Endre hvem som gjorde det',
  edit: 'Endre oppgave',
  cancel: 'Avbryt',
};

/** Valgene for en rad, i fast rekkefølge. «Avbryt» står alltid sist. */
export function rowActions(row: RowFacts): RowAction[] {
  const actions: (RowAction | false)[] = (() => {
    switch (row.kind) {
      case 'open':
        return ['postpone', row.canPickDoer && 'pickDoer', 'edit'];
      case 'upcoming':
        return [row.checkable && row.canPickDoer && 'pickDoer', 'edit'];
      case 'done':
        return ['remove', row.canReassign && 'reassign', row.canEdit && 'edit'];
      case 'recent':
        return [row.canEdit && 'edit'];
    }
  })();
  return [...actions.filter((a): a is RowAction => a !== false), 'cancel'];
}

/** Redigeringsskjermen: jobber har sitt eget korte skjema. */
export function editHref(taskId: string, recurrenceType: Task['recurrence_type'] | null) {
  const pathname = recurrenceType === 'job' ? ('/job/[id]' as const) : ('/task/[id]' as const);
  return { pathname, params: { id: taskId } };
}
