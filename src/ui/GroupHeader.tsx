import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { minTouch, radius } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  title: string;
  count: number;
  open: boolean;
  onPress: () => void;
  /** Til venstre: IconBadge for en kategori, Avatar for en person. */
  left?: ReactNode;
};

/** Overskrift på en gruppe som kan foldes ut og inn: ikon, navn, antall og pil. */
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
        <Text variant="sectionTitle" numberOfLines={1} style={styles.title}>{title}</Text>
        <Text variant="metaStrong" color={colors.textMuted}>{count}</Text>
      </View>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: minTouch + 8,
      paddingHorizontal: 6,
      borderRadius: radius.row,
    },
    pressed: { backgroundColor: colors.surfaceMuted },
    text: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    title: { flexShrink: 1 },
  }),
);
