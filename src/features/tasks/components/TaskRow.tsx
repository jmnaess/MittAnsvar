import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { type AvatarPhotoSource, AvatarStack, Chip, makeStyles, Text, useTheme } from '../../../ui';
import { toCategory } from '../categories';
import { formatKroner } from '../reward';
import { describeTaskSchedule, isTaskOverdue } from '../taskGroups';
import type { Task } from '../types';

export type RowPerson = { avatar: string; photo?: AvatarPhotoSource };

type Props = {
  task: Task;
  /** Den ansvarlige, eller barna som kan ta jobben. Tom = felles. */
  people: RowPerson[];
  /** «Leah», «Felles» eller «Alle barna». Leses opp, siden avatarene er skjult for skjermlesere. */
  assigneeName: string;
  /** Enhetens dato, for «neste …» og «Forfalt». */
  today: string;
  /** Person-visningen: kategorien først i undertittelen. */
  showCategory?: boolean;
  onPress: () => void;
};

/**
 * Én kompakt rad i et gruppekort i «Oppgaver»: tittel og gjentakelse med neste frist til venstre.
 * Til høyre: «Forfalt», lønn og avatarene til de tildelte (felles/ingen: et personer-ikon).
 */
export function TaskRow({ task, people, assigneeName, today, showCategory, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const meta = [showCategory && toCategory(task.category).label, describeTaskSchedule(task, today)]
    .filter(Boolean)
    .join(' · ');
  const reward = task.reward_nok ? formatKroner(task.reward_nok) : null;
  const overdue = isTaskOverdue(task, today);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[task.title, assigneeName, meta, overdue && 'forfalt', reward].filter(Boolean).join(', ')}
      accessibilityHint="Endre oppgaven"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text variant="rowTitleSmall">{task.title}</Text>
        {meta !== '' && <Text variant="metaSmall" color={colors.textMuted}>{meta}</Text>}
      </View>
      {overdue && <Chip label="Forfalt" tone="overdue" />}
      {reward && <Chip label={reward} tone="money" />}
      {people.length === 0 ? (
        <View style={styles.shared} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Ionicons name="people" size={14} color={colors.textMuted} />
        </View>
      ) : (
        <AvatarStack people={people} size={24} max={3} />
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 48,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
    },
    pressed: { backgroundColor: colors.surfaceMuted },
    text: { flex: 1, gap: 1 },
    shared: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
  }),
);
