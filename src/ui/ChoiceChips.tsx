import { StyleSheet, View } from 'react-native';
import { ChoiceChip } from './ChoiceChip';
import { Text } from './Text';

type Option<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
  label?: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
};

/** Velg én av flere verdier. Brukes til husstandstype, boligtype, tone og gjentakelse. */
export function ChoiceChips<T extends string | number>({ label, options, value, onChange, disabled }: Props<T>) {
  return (
    <View style={styles.wrapper}>
      {label && <Text variant="label">{label}</Text>}
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((option) => (
          <ChoiceChip
            key={option.value}
            label={option.label}
            selected={option.value === value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            role="radio"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
