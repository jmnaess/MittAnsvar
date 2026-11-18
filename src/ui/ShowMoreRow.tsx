import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { minTouch, spacing } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  /** Teksten når listen er sammenfoldet, f.eks. «4 til gjort i dag». */
  label: string;
  expanded: boolean;
  onPress: () => void;
  /** Til skjermleser når listen er sammenfoldet. */
  accessibilityLabel?: string;
};

/** Liten rad som folder en liste ut og inn. Utfoldet står det «Vis færre». */
export function ShowMoreRow({ label, expanded, onPress, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={expanded ? 'Vis færre' : accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text variant="label" color={colors.textMuted}>{expanded ? 'Vis færre' : label}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.row / 2,
  },
  pressed: { opacity: 0.6 },
});
