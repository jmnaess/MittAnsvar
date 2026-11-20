import type { CompletionResult, FeedbackKind } from '../completions/api';
import { formatKroner } from '../tasks/reward';

/** Det fullskjermsfeiringen for barn viser. Se CelebrationOverlay. */
export type Celebration = {
  /** Ny verdi starter nedtellingen på nytt. */
  completionId: string;
  kind: FeedbackKind;
  text: string;
  /** «+10 kr». Utelatt = ingen lønn. */
  reward?: string;
  /** Lønnen venter på godkjenning fra en voksen. */
  pending: boolean;
  /** Hvor lenge feiringen står før den lukker seg selv. */
  durationMs: number;
  /** Antall konfettibiter. 0 = ingen. */
  confetti: number;
  /** Figuren vrikker (5 år eller yngre). */
  wiggle: boolean;
};

/** Når serveren ikke fant noen tekst. */
const FALLBACK_TEXT: Record<FeedbackKind, string> = {
  regular: 'Godt gjort!',
  day_done: 'Alt er gjort i dag! 🎉',
  young: 'Hurra!',
};

const DURATION_MS: Record<FeedbackKind, number> = {
  regular: 2200,
  young: 2200,
  day_done: 3200,
};

const CONFETTI_COUNT = 16;

export function toCelebration(
  result: Pick<CompletionResult, 'completionId' | 'feedbackText' | 'feedbackKind' | 'rewardNok' | 'pending'>,
): Celebration {
  const kind = result.feedbackKind;
  return {
    completionId: result.completionId,
    kind,
    text: result.feedbackText ?? FALLBACK_TEXT[kind],
    reward: result.rewardNok ? `+${formatKroner(result.rewardNok)}` : undefined,
    pending: !!result.rewardNok && result.pending,
    durationMs: DURATION_MS[kind],
    confetti: kind === 'day_done' ? CONFETTI_COUNT : 0,
    wiggle: kind === 'young',
  };
}

/** Er oppgaven den eneste som gjenstår i personens «I dag»? Da er det siste for dagen. */
export function isLastOfToday(remainingTaskIds: readonly string[], taskId: string): boolean {
  return remainingTaskIds.length === 1 && remainingTaskIds[0] === taskId;
}
