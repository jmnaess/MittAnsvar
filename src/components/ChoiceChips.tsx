import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label?: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
};

/** Velg én av flere verdier. Brukes til husstandstype, boligtype og tone. */
export function ChoiceChips<T extends string>({ label, options, value, onChange, disabled }: Props<T>) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              style={[styles.chip, selected && styles.chipSelected, disabled && styles.disabled]}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !!disabled }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 15, color: colors.text, fontWeight: '500' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.selected },
  chipText: { fontSize: 15, color: colors.text },
  chipTextSelected: { color: colors.primary, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
