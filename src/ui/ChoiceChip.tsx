import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { radius } from './theme';
import { useTheme } from './ThemeProvider';

export type ChipIconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** radio = ett valg i en gruppe, checkbox = flere valg. Brukes av skjermlesere. */
  role: 'radio' | 'checkbox';
  /** Foran teksten, f.eks. en Avatar på 20 px. */
  left?: ReactNode;
  /** Ikon foran teksten. Farges av brikken: onPrimary når valgt, ellers textMuted. */
  icon?: ChipIconName;
};

// 32 px høy + 6 px hitSlop over og under = 44 px trykkflate.
const HIT_SLOP = { top: 6, bottom: 6 };

/**
 * Den ene valgbrikken i appen: liten pille med valgfri avatar eller ikon foran.
 * Brukes av FilterChips (én rad som rulles), ChoiceChips og MultiChoiceChips (bryter linje).
 * Ikke det samme som Chip, som bare er en merkelapp.
 */
export function ChoiceChip({ label, selected, onPress, disabled, role, left, icon }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fg = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.chip,
        (left != null || icon != null) && styles.withLeft,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'radio'
        ? { selected, disabled: !!disabled }
        : { checked: selected, disabled: !!disabled }}
    >
      {left}
      {icon && <Ionicons name={icon} size={16} color={selected ? colors.onPrimary : colors.textMuted} />}
      <Text variant="label" color={fg}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 32,
      paddingHorizontal: 12,
      borderRadius: radius.filterChip,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    withLeft: { paddingLeft: 6 },
    selected: { backgroundColor: colors.primary, borderColor: colors.primary },
    pressed: { backgroundColor: colors.surfaceMuted },
    disabled: { opacity: 0.5 },
  }),
);
