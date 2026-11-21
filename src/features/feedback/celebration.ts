import type { CompletionResult, FeedbackKind } from '../completions/api';
import { formatKroner } from '../tasks/reward';

/** Rødt emoji-hjerte. Variasjonsvelgeren U+FE0F gjør at iOS alltid viser emoji, ikke tekst-hjerte. */
export const RED_HEART = '\u2764\uFE0F';

/** Overskrift med lønn og uten. Samme glede, ulik smak. */
export const HEADLINE_PAID = 'Ka-ching!';
export const HEADLINE_UNPAID = `${RED_HEART}-ching!`;
/** Skjermleseren leser denne i stedet for overskriften (ikke «rødt hjerte-ching»). */
export const HEADLINE_LABEL = 'Bra jobba!';

export type CelebrationParticles = 'coins' | 'hearts';

/** Det fullskjermsfeiringen for barn viser. Se CelebrationOverlay. */
export type Celebration = {
  /** Ny verdi starter nedtellingen på nytt. */
  completionId: string;
  kind: FeedbackKind;
  /** «Ka-ching!» eller «❤️-ching!». */
  headline: string;
  /** Det skjermleseren sier i stedet for overskriften. */
  headlineLabel: string;
  text: string;
  /** «+10 kr» eller «+10 kr på vei». Utelatt = ingen lønn. */
  reward?: string;
  /** Lønnen venter på godkjenning fra en voksen. */
  pending: boolean;
  /** Hvor lenge feiringen står før den lukker seg selv. */
  durationMs: number;
  /** Mynter (lønn) eller hjerter (uten lønn, og alltid for de minste). */
  particles: CelebrationParticles;
  particleCount: number;
  /** Antall konfettibiter. 0 = ingen. Bare siste for dagen. */
  confetti: number;
  /** Lett dunk i hånden. Ikke for de minste. */
  haptic: boolean;
  /** Figuren vrikker (5 år eller yngre). */
  wiggle: boolean;
};

/** Når serveren ikke fant noen tekst. */
const FALLBACK_TEXT: Record<FeedbackKind, string> = {
  regular: 'Godt gjort!',
  day_done: 'Alt er gjort i dag! 🎉',
  young: 'Hurra!',
};

/**
 * Tekster når oppgaven har lønn. Ikke grådige: de roser innsatsen, ikke pengene.
 * Ligger i appen inntil videre; flyttes til feedback_messages senere.
 */
export const REWARD_TEXTS = [
  'Godt jobbet.',
  'Det lønner seg å ta i et tak!',
  'Fortjent!',
  'Takk for hjelpen!',
  'Innsats gir uttelling.',
  'Det var verdt innsatsen.',
  'Jobben er gjort, og gjort bra.',
  'Hjemmet takker deg.',
  'Godt å ha deg på laget.',
  'Det var en god jobb.',
] as const;

/** Etter beløpet når lønnen venter på en voksen: «+20 kr på vei». */
export const PENDING_SUFFIX = 'på vei';

/** Visningstid: grunntid + tid per ord, med et tak. Siste for dagen får litt ekstra. */
const BASE_MS = 3500;
const PER_WORD_MS = 400;
const MAX_MS = 7000;
const DAY_DONE_EXTRA_MS = 1500;

const CONFETTI_COUNT = 16;
const PARTICLE_COUNT = 12;
/** Siste for dagen: færre mynter/hjerter, siden konfettien også er der. */
const DAY_DONE_PARTICLE_COUNT = 8;

/** Ord med minst én bokstav eller ett tall. Emoji og tankestrek teller ikke. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/**
 * Hvor lenge feiringen står: 3,5 s + 0,4 s per ord, maks 7 s. Siste for dagen: 1,5 s ekstra
 * (maks 8,5 s). Teksten og beløpslinjen teller, overskriften ikke.
 */
export function celebrationDurationMs(kind: FeedbackKind, shownTexts: readonly string[]): number {
  const words = shownTexts.reduce((sum, t) => sum + countWords(t), 0);
  const base = Math.min(MAX_MS, BASE_MS + PER_WORD_MS * words);
  return kind === 'day_done' ? base + DAY_DONE_EXTRA_MS : base;
}

/** En tilfeldig lønnstekst, men aldri den samme som forrige gang. */
export function pickRewardText(previous: string | null, random: () => number = Math.random): string {
  const choices = REWARD_TEXTS.filter((t) => t !== previous);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

/** Forrige lønnstekst i denne appøkten, så den ikke kommer to ganger på rad. */
let lastRewardText: string | null = null;

/** Bare for tester. */
export function resetRewardTextMemory(): void {
  lastRewardText = null;
}

export function toCelebration(
  result: Pick<CompletionResult, 'completionId' | 'feedbackText' | 'feedbackKind' | 'rewardNok' | 'pending'>,
): Celebration {
  const kind = result.feedbackKind;
  const paid = !!result.rewardNok && result.rewardNok > 0;
  const young = kind === 'young';
  // For de minste er ikke pengene poenget: hjerter og enkle tekster, også med lønn.
  const coins = paid && !young;
  const pending = paid && result.pending;

  let text = result.feedbackText ?? FALLBACK_TEXT[kind];
  if (coins && kind === 'regular') {
    text = pickRewardText(lastRewardText);
    lastRewardText = text;
  }

  const amount = paid ? `+${formatKroner(result.rewardNok!)}` : undefined;
  const reward = amount && pending ? `${amount} ${PENDING_SUFFIX}` : amount;
  const dayDone = kind === 'day_done';
  return {
    completionId: result.completionId,
    kind,
    headline: coins ? HEADLINE_PAID : HEADLINE_UNPAID,
    headlineLabel: HEADLINE_LABEL,
    text,
    reward,
    pending,
    durationMs: celebrationDurationMs(kind, [text, reward ?? '']),
    particles: coins ? 'coins' : 'hearts',
    particleCount: dayDone ? DAY_DONE_PARTICLE_COUNT : PARTICLE_COUNT,
    confetti: dayDone ? CONFETTI_COUNT : 0,
    haptic: !young,
    wiggle: young,
  };
}

/** Er oppgaven den eneste som gjenstår i personens «I dag»? Da er det siste for dagen. */
export function isLastOfToday(remainingTaskIds: readonly string[], taskId: string): boolean {
  return remainingTaskIds.length === 1 && remainingTaskIds[0] === taskId;
}
