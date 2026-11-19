import { Chip, ListRow } from '../../../ui';
import { describeRecurrence, formatNextDue, isSeasonal } from '../../tasks/recurrence';
import type { Task } from '../../tasks/types';

type Props = {
  task: Task;
  /** Hvem oppgaven er til, eller «Felles». */
  assigneeName: string;
  /** Utelatt = bare visning (barn kan ikke redigere). */
  onPress?: () => void;
  /** Gjentakelse og neste frist i én tekst («Hver 3. måned · neste i mars»). Brukes i «Med jevne mellomrom». */
  when?: string;
};

/** En egen oppgave i årshjulet, merket «Egen». Trykk åpner den for redigering. */
export function OwnYearTaskRow({ task, assigneeName, onPress, when }: Props) {
  return (
    <ListRow
      title={task.title}
      badge={<Chip label="Egen" />}
      meta={
        when
          ? [assigneeName, when]
          : [assigneeName, isSeasonal(task) && describeRecurrence(task), `Neste frist: ${formatNextDue(task)}`]
      }
      onPress={onPress}
      accessibilityLabel={`${task.title}. Egen oppgave`}
      accessibilityHint={onPress ? 'Åpner oppgaven for redigering' : undefined}
    />
  );
}
