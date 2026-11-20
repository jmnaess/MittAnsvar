import { Chip, ListRow, SwitchSpacer } from '../../../ui';
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
  /** Trykk på raden åpner «Slik gjør du» i stedet for oppgaven (for tekst til skjermleser). */
  opensHowTo?: boolean;
  /** Åpner «Slik gjør du». */
  onInfoPress?: () => void;
};

/** En egen oppgave i årshjulet, merket «Egen». Trykk åpner den for redigering. Plass til bryter og pil som malradene. */
export function OwnYearTaskRow({ task, assigneeName, onPress, opensHowTo = false, when, onInfoPress }: Props) {
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
      onInfoPress={onInfoPress}
      reserveChevron
      // Ingen bryter, men samme plass som malradene, så (i) og pilen står likt.
      right={<SwitchSpacer />}
      accessibilityLabel={`${task.title}. Egen oppgave`}
      accessibilityHint={onPress ? (opensHowTo ? 'Viser slik gjør du' : 'Åpner oppgaven for redigering') : undefined}
    />
  );
}
