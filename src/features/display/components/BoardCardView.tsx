import { Text, SectionCard, useTheme } from '../../../ui';
import { DoneList } from '../../completions/components/DoneList';
import { progressText } from '../../completions/doneToday';
import type { TodayCompletion } from '../../completions/api';
import { memberPhoto } from '../../household/photo';
import { TodayTaskRow } from '../../tasks/components/TodayTaskRow';
import { cardDoerId, JOBS_KEY, THIS_MONTH_KEY } from '../../tasks/groupToday';
import { describeJobMembers } from '../../tasks/job';
import type { BoardCard } from '../board';
import type { BoardMember, BoardTask } from '../types';

type Props = {
  card: BoardCard;
  members: BoardMember[];
  photoUrls: Record<string, string>;
  userId: string | undefined;
  busyIds: ReadonlySet<string>;
  undoingId: string | undefined;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** doerId: personen når en felles rad står i personens kort (cardDoerId), ellers null. */
  onPress: (task: BoardTask, doerId: string | null) => void;
  /** «Slik gjør du» for raden, eller undefined = ikke ikon. */
  infoPressFor: (task: BoardTask) => (() => void) | undefined;
  onUndo: (completion: TodayCompletion) => void;
};

/** Ett kort på familieskjermen: en person, «Felles», «Denne måneden» eller «Ekstrajobber». */
export function BoardCardView({
  card, members, photoUrls, userId, busyIds, undoingId, expanded, onToggleExpanded, onPress, onUndo,
  infoPressFor,
}: Props) {
  const { personColor, sharedColors } = useTheme();
  const { member } = card;
  const color = member ? personColor(member.avatar) : sharedColors;
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.display_name;

  function assigneeName(task: BoardTask) {
    if (card.key === THIS_MONTH_KEY) return nameOf(task.assigned_member_id) ?? 'Felles';
    if (card.key === JOBS_KEY) return describeJobMembers(task.job_member_ids ?? [], members);
    // Personvisningen for en voksen: felles årshjul-oppgaver i personens kort.
    if (member && task.assigned_member_id === null) return 'Felles';
    return undefined;
  }

  const isEmpty = card.data.length === 0 && card.done.length === 0;

  return (
    <SectionCard
      title={card.title}
      color={color}
      avatar={member?.avatar}
      photo={member ? memberPhoto(member, photoUrls) : undefined}
      right={progressText(card.data.length, card.done.length)}
    >
      {isEmpty && <Text color={color.ink}>Ingenting i dag</Text>}
      {card.data.map((task) => (
        <TodayTaskRow
          key={task.id}
          task={task}
          large
          assigneeName={assigneeName(task)}
          checkColor={color.ring}
          busy={busyIds.has(task.id)}
          onPress={() => onPress(task, cardDoerId(card, task))}
          onInfoPress={infoPressFor(task)}
        />
      ))}
      <DoneList
        done={card.done}
        sectionKey={card.key}
        allDone={card.data.length === 0}
        nameOf={(id) => nameOf(id)}
        checkColor={color.ring}
        isAdult={false}
        userId={userId}
        busyId={undoingId}
        onUndo={onUndo}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        large
      />
    </SectionCard>
  );
}
