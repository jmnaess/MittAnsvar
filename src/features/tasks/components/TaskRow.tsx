import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { type AvatarPhotoSource, AvatarStack, Chip, InfoButton, makeStyles, Text, useTheme } from '../../../ui';
import { bundleReward, bundleSchedule } from '../taskGroups';
import type { Task } from '../types';

export type RowPerson = { avatar: string; photo?: AvatarPhotoSource };

type Props = {
  /** Én oppgave, eller flere like oppgaver for ulike personer (sammenslått). */
  tasks: Task[];
  /** De ansvarlige, eller barna som kan ta jobben. Tom = felles. */
  people: RowPerson[];
  /** «Leah», «Leah og Ola», «Felles» eller «Alle barna». Leses opp, siden avatarene er skjult for skjermlesere. */
  assigneeName: string;
  /** Enhetens dato, for «neste …» og «Forfalt». */
  today: string;
  onPress: () => void;
  /** Satt: (i)-ikon etter tittelen som åpner «Slik gjør du». */
  onInfoPress?: () => void;
};

/**
 * Én kompakt rad i et gruppekort i «Oppgaver»: tittel og gjentakelse med neste frist til venstre.
 * Til høyre: «Forfalt», lønn og avatarene til de tildelte (felles/ingen: et personer-ikon).
 * Flere oppgaver: nærmeste frist, «Forfalt» hvis én er forfalt, og lønnsspenn («10–20 kr»).
 */
export function TaskRow({ tasks, people, assigneeName, today, onPress, onInfoPress }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const task = tasks[0];
  const { schedule: meta, overdue } = bundleSchedule(tasks, today);
  const reward = bundleReward(tasks);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[task.title, assigneeName, meta, overdue && 'forfalt', reward].filter(Boolean).join(', ')}
      accessibilityHint={tasks.length > 1 ? 'Velg hvem sin oppgave du vil endre' : 'Endre oppgaven'}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text variant="rowTitleSmall">{task.title}</Text>
        {meta !== '' && <Text variant="metaSmall" color={colors.textMuted}>{meta}</Text>}
      </View>
      {onInfoPress && <InfoButton onPress={onInfoPress} title={task.title} />}
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
