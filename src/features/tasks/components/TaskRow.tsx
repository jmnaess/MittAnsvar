import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../components/theme';
import { formatDate } from '../../../lib/dates';
import { describeRecurrence } from '../recurrence';
import type { Task } from '../types';

type Props = {
  task: Task;
  /** Navnet på den ansvarlige, eller «Felles». */
  assigneeName: string;
  onPress: () => void;
};

/** Én oppgave i oversikten: tittel, ansvarlig, gjentakelse og neste frist. */
export function TaskRow({ task, assigneeName, onPress }: Props) {
  const due = task.next_due_on ? formatDate(task.next_due_on) : 'Ferdig';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Endre eller slette"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.detail}>
          {assigneeName} · {describeRecurrence(task)}
        </Text>
      </View>
      <Text style={styles.due}>{due}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  detail: { fontSize: 14, color: colors.muted },
  due: { fontSize: 14, color: colors.text },
  chevron: { fontSize: 24, color: colors.muted },
  pressed: { opacity: 0.6 },
});
