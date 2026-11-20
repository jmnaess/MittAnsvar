import { groupTodayByMember, isSharedYearTask, type TodaySection } from '../tasks/groupToday';
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
 * Kortene i «Alle» på familieskjermen: som boardCards, men uten felles årshjul-oppgaver i «Felles»
 * og «Denne måneden». De er for voksne, og her kan barna krysse av. De vises bare i
 * personvisningen for en voksen (boardPersonView), som henter dem fra boardCards.
 * Personkortene er uendret. «Felles» og «Denne måneden» uten innhold fjernes.
 */
export function boardAllCards(board: Pick<FamilyBoard, 'tasks' | 'members' | 'completions'>): BoardCard[] {
  return boardCards(board)
    .map((card) => (card.member ? card : { ...card, data: card.data.filter((t) => !isSharedYearTask(t)) }))
    .filter((card) => card.member !== null || card.data.length > 0 || card.done.length > 0);
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
