import { Chip, JobCard, TaskRow } from '../../../ui';
import { monthName } from '../../../lib/dates';
import { describeRecurrence } from '../recurrence';
import { formatKroner } from '../reward';
import type { Recurrence, TodayTask } from '../types';

/** Feltene raden viser. Familieskjermen får ikke hele oppgaven. */
type RowTask = Recurrence &
  Pick<TodayTask, 'title' | 'is_month_task' | 'is_overdue' | 'next_due_on' | 'reward_nok'>;

type Props = {
  task: RowTask;
  /** Vises i «Denne måneden» og «Ekstrajobber», der oppgavene ikke er gruppert per person. */
  assigneeName?: string;
  /** Fyllfarge på sjekkboksen: personens ring-farge. */
  checkColor?: string;
  /** Raden ligger i et hvitt kort («Denne måneden»). */
  muted?: boolean;
  /** Stor rad, til familieskjermen. */
  large?: boolean;
  busy?: boolean;
  /** Utført. */
  onPress: () => void;
  /**
   * Satt (bare voksne): sirkelen krysser av, og trykk på resten av raden gjør dette
   * («Hvem gjorde …?»). Utelatt: hele raden krysser av.
   */
  onRowPress?: () => void;
  /** Utelatt = langt trykk gjør ingenting (barnets enhet). Voksne: åpner valgene (TaskRowMenu). */
  onLongPress?: () => void;
  /** Hva trykk og langt trykk gjør, for skjermlesere. Standard: velg hvem som gjorde det. */
  longPressHint?: string;
  /** Satt: (i)-ikon som åpner «Slik gjør du» (useHowToSheet). */
  onInfoPress?: () => void;
};

const DEFAULT_HINT = 'Hold inne for å velge hvem som gjorde det';

/**
 * Linjen under tittelen: «I løpet av november» for månedsoppgaver, ellers gjentakelsen.
 * Forfalt vises som merkelapp til høyre, aldri med dato.
 */
function metaText(task: RowTask, assigneeName?: string): string {
  if (task.is_month_task && task.next_due_on) {
    const text = `I løpet av ${monthName(task.next_due_on)}`;
    return assigneeName ? `${text} · ${assigneeName}` : text;
  }
  const text = describeRecurrence(task);
  return assigneeName ? `${text} · ${assigneeName}` : text;
}

/**
 * Én oppgave i «I dag». Trykk = utført, langt trykk = onLongPress.
 * Med onRowPress: sirkelen = utført, raden = onRowPress.
 * Mens avkrysningen pågår, vises raden som utført.
 */
export function TodayTaskRow({
  task, assigneeName, checkColor, muted, large, busy, onPress, onRowPress, onLongPress,
  longPressHint = DEFAULT_HINT, onInfoPress,
}: Props) {
  const label = `${task.title}${task.is_overdue ? ', forfalt' : ''}`;
  const hasChips = task.reward_nok !== null || !!task.is_overdue;
  return (
    <TaskRow
      title={task.title}
      meta={metaText(task, assigneeName)}
      done={busy}
      disabled={busy}
      checkColor={checkColor}
      muted={muted}
      large={large}
      onPress={onRowPress ?? onPress}
      onCheckPress={onRowPress ? onPress : undefined}
      checkAccessibilityLabel={onRowPress ? `Marker ${task.title} som utført` : undefined}
      onLongPress={onLongPress}
      onInfoPress={onInfoPress}
      accessibilityLabel={onRowPress ? label : `${label}. Marker som utført`}
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

/** En ekstrajobb som kort i rutenettet. Trykk = utført, som en vanlig oppgave. */
export function TodayJobCard({
  task, assigneeName, busy, onPress, onLongPress, longPressHint = DEFAULT_HINT,
}: Omit<Props, 'checkColor' | 'muted' | 'onInfoPress'>) {
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
