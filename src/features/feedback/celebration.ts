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

/** Teksten under beløpet når lønnen venter på en voksen. */
export const PENDING_TEXT = 'Venter på godkjenning';

/** Visningstid: grunntid + tid per ord, med et tak. Siste for dagen får litt ekstra. */
const BASE_MS = 3500;
const PER_WORD_MS = 400;
const MAX_MS = 7000;
const DAY_DONE_EXTRA_MS = 1500;

const CONFETTI_COUNT = 16;

/** Ord med minst én bokstav eller ett tall. Emoji og tankestrek teller ikke. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/**
 * Hvor lenge feiringen står: 3,5 s + 0,4 s per ord, maks 7 s. Siste for dagen: 1,5 s ekstra
 * (maks 8,5 s). Alt som står på skjermen teller: teksten, beløpet og «Venter på godkjenning».
 */
export function celebrationDurationMs(kind: FeedbackKind, shownTexts: readonly string[]): number {
  const words = shownTexts.reduce((sum, t) => sum + countWords(t), 0);
  const base = Math.min(MAX_MS, BASE_MS + PER_WORD_MS * words);
  return kind === 'day_done' ? base + DAY_DONE_EXTRA_MS : base;
}

export function toCelebration(
  result: Pick<CompletionResult, 'completionId' | 'feedbackText' | 'feedbackKind' | 'rewardNok' | 'pending'>,
): Celebration {
  const kind = result.feedbackKind;
  const text = result.feedbackText ?? FALLBACK_TEXT[kind];
  const reward = result.rewardNok ? `+${formatKroner(result.rewardNok)}` : undefined;
  const pending = !!result.rewardNok && result.pending;
  const shown = [text, reward ?? '', pending ? PENDING_TEXT : ''];
  return {
    completionId: result.completionId,
    kind,
    text,
    reward,
    pending,
    durationMs: celebrationDurationMs(kind, shown),
    confetti: kind === 'day_done' ? CONFETTI_COUNT : 0,
    wiggle: kind === 'young',
  };
}

/** Er oppgaven den eneste som gjenstår i personens «I dag»? Da er det siste for dagen. */
export function isLastOfToday(remainingTaskIds: readonly string[], taskId: string): boolean {
  return remainingTaskIds.length === 1 && remainingTaskIds[0] === taskId;
}
