import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { minTouch } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  title: string;
  count: number;
  open: boolean;
  onPress: () => void;
  /** Til venstre: IconBadge (34) for en kategori, Avatar (34) for en person. */
  left?: ReactNode;
};

/** Overskrift øverst i et GroupCard, kan foldes ut og inn: ikon, navn, antall og pil (ned = åpen). */
export function GroupHeader({ title, count, open, onPress, left }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${title}, ${count} ${count === 1 ? 'oppgave' : 'oppgaver'}`}
      accessibilityHint={open ? 'Skjul oppgavene' : 'Vis oppgavene'}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {left}
      <View style={styles.text}>
        <Text variant="groupTitle" numberOfLines={1} style={styles.title}>{title}</Text>
        <Text variant="count" color={colors.textMuted}>{count}</Text>
      </View>
      <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: minTouch + 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    pressed: { backgroundColor: colors.surfaceMuted },
    text: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    title: { flexShrink: 1 },
  }),
);
