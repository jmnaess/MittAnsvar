import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { toNorwegianMessage } from '../../../lib/errors';
import { NoticeToast, UndoToast } from '../../../ui';
import { useRestoreTask } from '../hooks';
import { type LeftForm, takeLeftForm } from '../leftForm';

type Shown = LeftForm | { kind: 'error'; message: string; at: number };

/**
 * Toasten etter at et redigeringsskjema ble lukket fordi oppgaven er borte (leftForm.ts).
 * Hentes når skjermen får fokus igjen. Egen sletting gir «Angre», ellers en kort melding.
 * Returnerer elementet som skjermen legger nederst.
 */
export function useLeftFormToast(householdId: string, aboveFab?: boolean) {
  const restore = useRestoreTask(householdId);
  const [shown, setShown] = useState<Shown | null>(null);

  useFocusEffect(
    useCallback(() => {
      const left = takeLeftForm();
      if (left) setShown(left);
    }, []),
  );

  if (!shown) return null;
  const hide = () => setShown(null);

  if (shown.kind === 'deleted') {
    const { task } = shown;
    return (
      <UndoToast
        resetKey={`${task.id}-${shown.at}`}
        message={`Slettet: ${task.title}`}
        undoing={restore.isPending}
        onUndo={() =>
          restore.mutate(task.id, {
            onSuccess: hide,
            onError: (e) => setShown({ kind: 'error', message: toNorwegianMessage(e), at: Date.now() }),
          })
        }
        onHide={hide}
        aboveFab={aboveFab}
      />
    );
  }

  return <NoticeToast resetKey={String(shown.at)} message={shown.message} onHide={hide} aboveFab={aboveFab} />;
}
