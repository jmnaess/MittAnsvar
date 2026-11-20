import { groupTodayByMember, type TodaySection } from '../tasks/groupToday';
import type { BoardMember, BoardTask, FamilyBoard } from './types';

export type BoardCard = TodaySection<BoardTask, BoardMember>;

/**
 * Kortene på familieskjermen: én per person (også uten oppgaver, så alle ser seg selv), og så
 * «Felles», «Denne måneden» og «Ekstrajobber» når de har innhold.
 */
export function boardCards(board: Pick<FamilyBoard, 'tasks' | 'members' | 'completions'>): BoardCard[] {
  return groupTodayByMember(board.tasks, board.members, {
    done: board.completions,
    showAllMembers: true,
  });
}

/**
 * Oppgavene som står igjen på personens eget kort i dag. Brukes for «siste for dagen»
 * (CelebrationOverlay). «Felles», «Denne måneden» og «Ekstrajobber» telles ikke.
 */
export function memberTodayTaskIds(
  board: Pick<FamilyBoard, 'tasks' | 'members' | 'completions'>,
  memberId: string,
): string[] {
  const card = boardCards(board).find((c) => c.member?.id === memberId);
  return card ? card.data.map((t) => t.id) : [];
}
