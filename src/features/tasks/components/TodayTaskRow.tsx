import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../components/theme';
import { formatDate, monthName } from '../../../lib/dates';
import { describeRecurrence } from '../recurrence';
import { formatKroner } from '../reward';
import type { TodayTask } from '../types';

type Props = {
  task: TodayTask;
  /** Vises i «Denne måneden» og «Ledige jobber», der oppgavene ikke er gruppert per person. */
  assigneeName?: string;
  busy?: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

/** Linjen under tittelen: forfalt, «i løpet av november», hvem jobben er for, eller gjentakelsen. */
function detailText(task: TodayTask, assigneeName?: string): { text: string; overdue: boolean } {
  const due = task.next_due_on;
  if (task.recurrence_type === 'job') {
    const who = assigneeName ?? 'Alle barna';
    return { text: task.job_repeats ? `${who} · kan gjøres flere ganger` : who, overdue: false };
  }
  if (task.is_month_task && due) {
    const month = monthName(due);
    if (task.is_overdue) return { text: `Forfalt – skulle vært gjort i ${month}`, overdue: true };
    const text = `I løpet av ${month}`;
    return { text: assigneeName ? `${text} · ${assigneeName}` : text, overdue: false };
  }
  if (task.is_overdue && due) return { text: `Forfalt fra ${formatDate(due)}`, overdue: true };
  return { text: describeRecurrence(task), overdue: false };
}

/** Én oppgave i «I dag». Trykk = utført, langt trykk = velg hvem som gjorde det. Lønn til høyre. */
export function TodayTaskRow({ task, assigneeName, busy, onPress, onLongPress }: Props) {
  const detail = detailText(task, assigneeName);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${task.title}. Marker som utført`}
      accessibilityHint="Hold inne for å velge hvem som gjorde det"
      style={({ pressed }) => [styles.row, (pressed || busy) && styles.pressed]}
    >
      <View style={[styles.circle, busy && styles.circleBusy]} />
      <View style={styles.text}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={detail.overdue ? styles.overdue : styles.detail}>{detail.text}</Text>
      </View>
      {task.reward_nok !== null && <Text style={styles.reward}>{formatKroner(task.reward_nok)}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  pressed: { opacity: 0.5 },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.primary },
  circleBusy: { backgroundColor: colors.selected },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  detail: { fontSize: 14, color: colors.muted },
  overdue: { fontSize: 14, color: colors.danger },
  reward: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
