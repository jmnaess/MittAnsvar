import { groupTodayByMember, type TodaySection } from '../tasks/groupToday';
import type { BoardMember, BoardTask, FamilyBoard } from './types';

export type BoardCard = TodaySection<BoardTask, BoardMember>;

/**
 * Kortene på familieskjermen: én per person (også uten oppgaver, så alle ser seg selv), og så
 * «Felles», «Denne måneden» og «Ledige jobber» når de har innhold.
 */
export function boardCards(board: Pick<FamilyBoard, 'tasks' | 'members' | 'completions'>): BoardCard[] {
  return groupTodayByMember(board.tasks, board.members, {
    done: board.completions,
    showAllMembers: true,
  });
}
