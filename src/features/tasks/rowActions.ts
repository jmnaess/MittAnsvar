// Menyen voksne får ved langt trykk på en oppgaverad i «I dag» og personvisningen, og hva
// vanlig trykk gjør (rowPress). Rader uten noen å velge åpner menyen også ved trykk.
// Her bestemmes hvilke valg en rad får. Selve menyen er components/TaskRowMenu.tsx.

import type { Task } from './types';

export type RowAction = 'postpone' | 'pickDoer' | 'remove' | 'reassign' | 'edit' | 'cancel';

/** Det menyen må vite om raden. */
export type RowFacts =
  /** Åpen oppgave i dag. canPickDoer: husstanden har flere enn én person. */
  | { kind: 'open'; canPickDoer: boolean }
  /** «Kommende». checkable: nærmeste forekomst, som kan krysses av tidlig og utsettes. */
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

/**
 * Hva vanlig trykk på raden gjør (voksne): «Hvem gjorde …?», «Endre hvem som gjorde det», eller
 * åpner valgene når det ikke finnes noen å velge.
 */
export function rowPress(row: RowFacts): 'pickDoer' | 'reassign' | 'menu' {
  switch (row.kind) {
    case 'open':
      return row.canPickDoer ? 'pickDoer' : 'menu';
    case 'upcoming':
      return row.checkable && row.canPickDoer ? 'pickDoer' : 'menu';
    case 'done':
      return row.canReassign ? 'reassign' : 'menu';
    case 'recent':
      return 'menu';
  }
}

/**
 * Valgene for en rad, i fast rekkefølge. «Avbryt» står alltid sist. «Velg/Endre hvem som gjorde
 * det» står bare i menyen når vanlig trykk ikke allerede gjør det (se rowPress), så valget aldri
 * forsvinner helt.
 */
export function rowActions(row: RowFacts): RowAction[] {
  const byPress = rowPress(row) !== 'menu';
  const actions: (RowAction | false)[] = (() => {
    switch (row.kind) {
      case 'open':
        return ['postpone', row.canPickDoer && !byPress && 'pickDoer', 'edit'];
      case 'upcoming':
        return [
          row.checkable && 'postpone',
          row.checkable && row.canPickDoer && !byPress && 'pickDoer',
          'edit',
        ];
      case 'done':
        return ['remove', row.canReassign && !byPress && 'reassign', row.canEdit && 'edit'];
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
