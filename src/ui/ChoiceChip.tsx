import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, minTouch, radius } from './theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** radio = ett valg i en gruppe, checkbox = flere valg. Brukes av skjermlesere. */
  role: 'radio' | 'checkbox';
};

/**
 * Én valgknapp (pille). Brukes av ChoiceChips (ett valg) og MultiChoiceChips (flere valg).
 * Ikke det samme som Chip, som bare er en merkelapp.
 */
export function ChoiceChip({ label, selected, onPress, disabled, role }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole={role}
      accessibilityState={role === 'radio'
        ? { selected, disabled: !!disabled }
        : { checked: selected, disabled: !!disabled }}
    >
      <Text variant={selected ? 'bodyStrong' : 'body'} color={selected ? colors.onPrimary : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: minTouch,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    paddingHorizontal: 16,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primary },
  pressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.5 },
});
