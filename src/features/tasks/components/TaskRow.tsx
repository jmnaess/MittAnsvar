import { formatDate, formatMonthYear } from '../../../lib/dates';
import { colors, ListRow, Text } from '../../../ui';
import { describeRecurrence, isJob, isMonthTask } from '../recurrence';
import { formatKroner } from '../reward';
import type { Task } from '../types';

type Props = {
  task: Task;
  /** Navnet på den ansvarlige, «Felles», eller «Alle barna» for jobber. */
  assigneeName: string;
  onPress: () => void;
};

/** Én oppgave i oversikten: tittel, ansvarlig, gjentakelse, lønn og neste frist. */
export function TaskRow({ task, assigneeName, onPress }: Props) {
  // Månedsoppgaver har hele måneden som frist, så en dato (den 1.) ville vært misvisende.
  // Jobber har ingen frist. «Ledig jobb» står allerede i beskrivelsen.
  const due = isJob(task)
    ? null
    : !task.next_due_on
      ? 'Ferdig'
      : isMonthTask(task)
        ? formatMonthYear(task.next_due_on)
        : formatDate(task.next_due_on);

  return (
    <ListRow
      title={task.title}
      meta={[assigneeName, describeRecurrence(task), task.reward_nok && formatKroner(task.reward_nok)]
        .filter(Boolean)
        .join(' · ')}
      right={due ? <Text variant="metaStrong" color={colors.textWarm}>{due}</Text> : undefined}
      onPress={onPress}
      accessibilityHint="Endre eller slette"
    />
  );
}
