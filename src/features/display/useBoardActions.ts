import { useEffect, useState } from 'react';
import { toNorwegianMessage } from '../../lib/errors';
import type { TodayCompletion } from '../completions/api';
import { isLastOfToday, toCelebration, type Celebration } from '../feedback/celebration';
import { formatKroner } from '../tasks/reward';
import { memberTodayTaskIds } from './board';
import { chooseBoardDoer } from './chooseBoardDoer';
import { useCompleteOnBoard, useUndoOnBoard } from './hooks';
import type { BoardMember, BoardTask, FamilyBoard } from './types';

type Toast = { completionId: string; title: string; message: string | null; reward?: string };
type Picking = { task: BoardTask; members: BoardMember[] };
/** Fullskjermsfeiring når et barn har krysset av. */
type BoardCelebration = { celebration: Celebration; member: BoardMember };

/** Hvor lenge en feilmelding står på den felles skjermen. */
const ERROR_VISIBLE_MS = 8000;

/**
 * Avkrysning og angring på familieskjermen. Barn får en feiring i fullskjerm, voksne det vanlige
 * banneret med «Angre».
 * Flere kan trykke samtidig, så hver rad følges for seg. mutateAsync brukes fordi callbacks gitt
 * til mutate() bare kjøres for det siste kallet.
 */
export function useBoardActions(board: FamilyBoard) {
  const members = board.members;
  const complete = useCompleteOnBoard();
  const undo = useUndoOnBoard();
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [celebration, setCelebration] = useState<BoardCelebration | null>(null);
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
      const doer = members.find((m) => m.id === memberId);
      const lastToday =
        doer?.role === 'child' && isLastOfToday(memberTodayTaskIds(board, memberId), task.id);
      const result = await complete.mutateAsync({ taskId: task.id, memberId, lastToday });
      if (doer?.role === 'child') {
        setToast(null);
        setCelebration({ celebration: toCelebration(result), member: doer });
        return;
      }
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

  /** doerId: satt for en felles rad i personens kort (cardDoerId), da krysses det av for personen. */
  function press(task: BoardTask, doerId: string | null = null) {
    if (doerId) {
      completeFor(task, doerId);
      return;
    }
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
      setCelebration((c) => (c?.celebration.completionId === completionId ? null : c));
    } catch (e) {
      setToast((t) => (t?.completionId === completionId ? null : t));
      setError(toNorwegianMessage(e));
    }
  }

  return {
    busyIds,
    toast,
    celebration,
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
    hideCelebration: () => setCelebration(null),
  };
}
