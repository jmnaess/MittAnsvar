import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from './theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** radio = ett valg i en gruppe, checkbox = flere valg. Brukes av skjermlesere. */
  role: 'radio' | 'checkbox';
};

/** Én avrundet valgknapp. Brukes av ChoiceChips (ett valg) og MultiChoiceChips (flere valg). */
export function Chip({ label, selected, onPress, disabled, role }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.disabled]}
      accessibilityRole={role}
      accessibilityState={role === 'radio'
        ? { selected, disabled: !!disabled }
        : { checked: selected, disabled: !!disabled }}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.selected },
  text: { fontSize: 15, color: colors.text },
  textSelected: { color: colors.primary, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
