import { Chip, ListRow } from '../../../ui';
import { formatNextDue } from '../../tasks/recurrence';
import type { Task } from '../../tasks/types';

type Props = {
  task: Task;
  /** Hvem oppgaven er til, eller «Felles». */
  assigneeName: string;
  /** Utelatt = bare visning (barn kan ikke redigere). */
  onPress?: () => void;
};

/** En egen årlig oppgave i årshjulet, merket «Egen». Trykk åpner den for redigering. */
export function OwnYearTaskRow({ task, assigneeName, onPress }: Props) {
  return (
    <ListRow
      title={task.title}
      badge={<Chip label="Egen" />}
      meta={[assigneeName, `Neste frist: ${formatNextDue(task)}`]}
      onPress={onPress}
      accessibilityLabel={`${task.title}. Egen oppgave`}
      accessibilityHint={onPress ? 'Åpner oppgaven for redigering' : undefined}
    />
  );
}
