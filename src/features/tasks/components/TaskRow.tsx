import { Avatar, type AvatarPhotoSource, AvatarStack, Chip, IconBadge, ListRow, useTheme } from '../../../ui';
import { toCategory } from '../categories';
import { formatKroner } from '../reward';
import { describeTaskSchedule } from '../taskGroups';
import type { Task } from '../types';

export type RowPerson = { avatar: string; photo?: AvatarPhotoSource };

type Props = {
  task: Task;
  /** Den ansvarlige, eller barna som kan ta jobben. Tom = felles. */
  people: RowPerson[];
  /** «Leah», «Felles» eller «Alle barna». Leses opp, siden avatarene er skjult for skjermlesere. */
  assigneeName: string;
  /** Enhetens dato, for «neste …» og «Forfalt». */
  today: string;
  /** Person-visningen: kategorien først i undertittelen. */
  showCategory?: boolean;
  onPress: () => void;
};

/** Én oppgave i «Oppgaver»: avatar(er), tittel, gjentakelse og neste frist, og lønn hvis satt. */
export function TaskRow({ task, people, assigneeName, today, showCategory, onPress }: Props) {
  const { sharedColors } = useTheme();
  const meta = [showCategory && toCategory(task.category).label, describeTaskSchedule(task, today)]
    .filter(Boolean)
    .join(' · ');
  const reward = task.reward_nok ? formatKroner(task.reward_nok) : null;

  const left =
    people.length === 0 ? (
      <IconBadge icon="people" size={32} background={sharedColors.tint} color={sharedColors.ink} />
    ) : people.length === 1 ? (
      <Avatar avatar={people[0].avatar} photo={people[0].photo} size={32} />
    ) : (
      <AvatarStack people={people} size={32} max={3} />
    );

  return (
    <ListRow
      title={task.title}
      meta={meta}
      left={left}
      right={reward ? <Chip label={reward} tone="money" /> : undefined}
      onPress={onPress}
      accessibilityLabel={[task.title, assigneeName, meta, reward].filter(Boolean).join(', ')}
      accessibilityHint="Endre oppgaven"
    />
  );
}
