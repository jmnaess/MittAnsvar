import { Chip, JobCard, TaskRow } from '../../../ui';
import { monthName } from '../../../lib/dates';
import { describeRecurrence } from '../recurrence';
import { formatKroner } from '../reward';
import type { TodayTask } from '../types';

type Props = {
  task: TodayTask;
  /** Vises i «Denne måneden» og «Ledige jobber», der oppgavene ikke er gruppert per person. */
  assigneeName?: string;
  /** Fyllfarge på sjekkboksen: personens ring-farge. */
  checkColor?: string;
  /** Raden ligger i et hvitt kort («Denne måneden»). */
  muted?: boolean;
  busy?: boolean;
  onPress: () => void;
  /** Utelatt = langt trykk gjør ingenting (barnets enhet). */
  onLongPress?: () => void;
  /** Hva langt trykk gjør, for skjermlesere. Standard: velg hvem som gjorde det. */
  longPressHint?: string;
};

const DEFAULT_HINT = 'Hold inne for å velge hvem som gjorde det';

/**
 * Linjen under tittelen: «I løpet av november» for månedsoppgaver, ellers gjentakelsen.
 * Forfalt vises som merkelapp til høyre, aldri med dato.
 */
function metaText(task: TodayTask, assigneeName?: string): string {
  if (task.is_month_task && task.next_due_on) {
    const text = `I løpet av ${monthName(task.next_due_on)}`;
    return assigneeName ? `${text} · ${assigneeName}` : text;
  }
  return describeRecurrence(task);
}

/**
 * Én oppgave i «I dag». Trykk = utført, langt trykk = velg hvem som gjorde det.
 * Mens avkrysningen pågår, vises raden som utført.
 */
export function TodayTaskRow({
  task, assigneeName, checkColor, muted, busy, onPress, onLongPress, longPressHint = DEFAULT_HINT,
}: Props) {
  const hasChips = task.reward_nok !== null || !!task.is_overdue;
  return (
    <TaskRow
      title={task.title}
      meta={metaText(task, assigneeName)}
      done={busy}
      disabled={busy}
      checkColor={checkColor}
      muted={muted}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`${task.title}${task.is_overdue ? ', forfalt' : ''}. Marker som utført`}
      accessibilityHint={onLongPress ? longPressHint : undefined}
      right={
        hasChips ? (
          <>
            {task.is_overdue && <Chip label="Forfalt" tone="overdue" />}
            {task.reward_nok !== null && <Chip label={formatKroner(task.reward_nok)} tone="money" />}
          </>
        ) : undefined
      }
    />
  );
}

/** En ledig jobb som kort i rutenettet. Trykk = utført, som en vanlig oppgave. */
export function TodayJobCard({
  task, assigneeName, busy, onPress, onLongPress, longPressHint = DEFAULT_HINT,
}: Omit<Props, 'checkColor' | 'muted'>) {
  const who = assigneeName ?? 'Alle barna';
  return (
    <JobCard
      amount={task.reward_nok !== null ? formatKroner(task.reward_nok) : undefined}
      title={task.title}
      who={task.job_repeats ? `${who} · kan gjøres flere ganger` : who}
      busy={busy}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityHint={onLongPress ? longPressHint : undefined}
    />
  );
}
