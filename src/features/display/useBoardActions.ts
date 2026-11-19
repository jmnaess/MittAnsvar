import { useEffect, useState } from 'react';
import { toNorwegianMessage } from '../../lib/errors';
import type { TodayCompletion } from '../completions/api';
import { formatKroner } from '../tasks/reward';
import { chooseBoardDoer } from './chooseBoardDoer';
import { useCompleteOnBoard, useUndoOnBoard } from './hooks';
import type { BoardMember, BoardTask } from './types';

type Toast = { completionId: string; title: string; message: string | null; reward?: string };
type Picking = { task: BoardTask; members: BoardMember[] };

/** Hvor lenge en feilmelding står på den felles skjermen. */
const ERROR_VISIBLE_MS = 8000;

/**
 * Avkrysning og angring på familieskjermen.
 * Flere kan trykke samtidig, så hver rad følges for seg. mutateAsync brukes fordi callbacks gitt
 * til mutate() bare kjøres for det siste kallet.
 */
export function useBoardActions(members: BoardMember[]) {
  const complete = useCompleteOnBoard();
  const undo = useUndoOnBoard();
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [picking, setPicking] = useState<Picking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), ERROR_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [error]);

  function setBusy(taskId: string, busy: boolean) {
    setBusyIds((ids) => {
      const next = new Set(ids);
      if (busy) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }

  async function completeFor(task: BoardTask, memberId: string) {
    setError(null);
    setBusy(task.id, true);
    try {
      const result = await complete.mutateAsync({ taskId: task.id, memberId });
      setToast({
        completionId: result.completionId,
        title: task.title,
        message: result.feedbackText,
        reward: result.rewardNok
          ? `+${formatKroner(result.rewardNok)}${result.pending ? ' – venter på godkjenning' : ''}`
          : undefined,
      });
    } catch (e) {
      setError(toNorwegianMessage(e));
    } finally {
      setBusy(task.id, false);
    }
  }

  function press(task: BoardTask) {
    const action = chooseBoardDoer(task, members);
    if (action.kind === 'direct') completeFor(task, action.memberId);
    else if (action.kind === 'pick') setPicking({ task, members: action.members });
  }

  function pick(member: BoardMember) {
    if (!picking) return;
    setPicking(null);
    completeFor(picking.task, member.id);
  }

  async function undoById(completionId: string) {
    setError(null);
    try {
      await undo.mutateAsync(completionId);
      setToast((t) => (t?.completionId === completionId ? null : t));
    } catch (e) {
      setToast((t) => (t?.completionId === completionId ? null : t));
      setError(toNorwegianMessage(e));
    }
  }

  return {
    busyIds,
    toast,
    picking,
    error,
    undoingId: undo.isPending ? undo.variables : undefined,
    undoing: undo.isPending,
    press,
    pick,
    cancelPick: () => setPicking(null),
    undoCompletion: (c: TodayCompletion) => undoById(c.id),
    undoToast: () => (toast ? undoById(toast.completionId) : undefined),
    hideToast: () => setToast(null),
  };
}
