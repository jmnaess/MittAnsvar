import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../components/theme';
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
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${task.title}. Egen oppgave`}
      accessibilityHint={onPress ? 'Åpner oppgaven for redigering' : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.badge}>Egen</Text>
        </View>
        <Text style={styles.detail}>{assigneeName}</Text>
        <Text style={styles.due}>Neste frist: {formatNextDue(task)}</Text>
      </View>
      {onPress && <Text style={styles.chevron}>›</Text>}
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
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.selected,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  detail: { fontSize: 14, color: colors.muted },
  due: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  chevron: { fontSize: 24, color: colors.muted },
});
