import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../components/theme';
import { formatDate } from '../../../lib/dates';
import { describeRecurrence } from '../recurrence';
import type { TodayTask } from '../types';

type Props = {
  task: TodayTask;
  busy?: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

/** Én oppgave i «I dag». Trykk = utført, langt trykk = velg hvem som gjorde det. */
export function TodayTaskRow({ task, busy, onPress, onLongPress }: Props) {
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
        {task.is_overdue && task.next_due_on ? (
          <Text style={styles.overdue}>Forfalt fra {formatDate(task.next_due_on)}</Text>
        ) : (
          <Text style={styles.detail}>{describeRecurrence(task)}</Text>
        )}
      </View>
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
});
