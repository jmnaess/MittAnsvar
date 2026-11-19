import type { BoardMember, FamilyBoard } from './types';
import { boardCards, type BoardCard } from './board';
import { groupRecentByDay, type RecentDay } from '../completions/recent';
import { focusSections } from '../tasks/groupToday';
import { buildUpcoming, CHILD_UPCOMING_DAYS, type MemberUpcoming, type UpcomingTask } from '../tasks/upcoming';

/**
 * «Kommende» på familieskjermen: 2 uker, som på barnets enhet. Ukentlige og andre hyppige
 * oppgaver vises én gang («Hver uke · neste lør. 21. nov.»), men ikke daglige: de står uansett i
 * «I dag» hver dag. Vinduet i get_family_board er like langt.
 */
export const DISPLAY_UPCOMING_DAYS = CHILD_UPCOMING_DAYS;

export type BoardPersonView = {
  /** Personens kort i dag, og personens egne oppgaver i «Denne måneden». Kan krysses av. */
  sections: BoardCard[];
  /** Bare visning. */
  upcoming: MemberUpcoming<UpcomingTask>;
  /** Bare visning. */
  recentDays: RecentDay[];
};

/** Personvisningen på familieskjermen for én person. */
export function boardPersonView(board: FamilyBoard, memberId: string): BoardPersonView {
  return {
    sections: focusSections(boardCards(board), memberId),
    upcoming: buildUpcoming(board.occurrences ?? [], board.upcoming_tasks ?? [], memberId, board.today, {
      windowDays: DISPLAY_UPCOMING_DAYS,
      hideDaily: true,
    }),
    recentDays: groupRecentByDay(board.recent ?? [], memberId, board.today),
  };
}

/** Personen som er valgt, eller null hvis ingen er valgt eller personen er borte fra husstanden. */
export function focusedMember(members: BoardMember[], focusedId: string | null): BoardMember | null {
  return members.find((m) => m.id === focusedId) ?? null;
}
