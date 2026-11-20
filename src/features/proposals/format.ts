import type { ChipTone } from '../../ui/Chip';
import { waitingText } from '../../ui/waitingText';
import { formatKroner } from '../tasks/reward';

/** Samme grenser som i databasen (task_proposals, submit_task_proposal). */
export const MAX_PROPOSAL_TITLE = 60;
export const MAX_PROPOSED_NOK = 200;
export const MAX_PENDING_PROPOSALS = 5;

export type ProposalStatus = 'pending' | 'approved' | 'rejected';

/** Merkelappen barnet ser: «Venter», «Godkjent +30 kr», «Godkjent», «Ikke denne gangen». */
export function proposalStatusChip(
  status: ProposalStatus,
  approvedNok: number | null,
): { label: string; tone: ChipTone } {
  if (status === 'pending') return { label: 'Venter', tone: 'neutral' };
  if (status === 'rejected') return { label: 'Ikke denne gangen', tone: 'neutral' };
  return approvedNok
    ? { label: `Godkjent +${formatKroner(approvedNok)}`, tone: 'money' }
    : { label: 'Godkjent', tone: 'neutral' };
}

/** Metalinjen: «Gjort · ønsker 30 kr», «Vil gjøre det · ønsker lønn», «Gjort · uten lønn». */
export function proposalMeta(p: {
  is_done: boolean;
  wants_reward: boolean;
  proposed_nok: number | null;
}): string {
  const done = p.is_done ? 'Gjort' : 'Vil gjøre det';
  const reward = !p.wants_reward
    ? 'uten lønn'
    : p.proposed_nok
      ? `ønsker ${formatKroner(p.proposed_nok)}`
      : 'ønsker lønn';
  return `${done} · ${reward}`;
}

/**
 * Beløp fra et tekstfelt i hele kroner. Tomt = 0 (ingen lønn). Ugyldig (ikke tall, over max)
 * = null.
 */
export function parseAmount(text: string, max: number): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n <= max ? n : null;
}

/** «Leah», «Leah og Ola», «Leah, Ola og Mia». */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`;
}

/**
 * Teksten i det gule banneret i «I dag» når noe venter på en voksen: avkrysninger med lønn
 * og forslag fra barna.
 *
 * - Bare forslag: «Leah har et forslag» / «Leah har 2 forslag» / «Leah og Ola har forslag».
 * - Bare avkrysninger: «Leah venter», «2 til godkjenning · 35 kr».
 * - Begge: «Leah og Ola venter», «2 til godkjenning · 35 kr · 1 forslag».
 *
 * names: unike navn i rekkefølge (alle som venter). proposalNames: unike navn med forslag.
 */
export function approvalBannerText(input: {
  names: string[];
  proposalNames: string[];
  completionCount: number;
  completionTotal: number;
  proposalCount: number;
}): { title: string; meta: string } {
  const { names, proposalNames, completionCount, completionTotal, proposalCount } = input;
  const proposalsText = `${proposalCount} forslag`;

  if (completionCount === 0) {
    let title: string;
    if (proposalNames.length > 1) title = `${joinNames(proposalNames)} har forslag`;
    else if (proposalCount === 1) title = `${proposalNames[0]} har et forslag`;
    else title = `${proposalNames[0]} har ${proposalCount} forslag`;
    return { title, meta: proposalsText };
  }

  const completionsText = `${completionCount} til godkjenning · ${formatKroner(completionTotal)}`;
  return {
    title: waitingText(names),
    meta: proposalCount > 0 ? `${completionsText} · ${proposalsText}` : completionsText,
  };
}
