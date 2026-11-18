import { StyleSheet, View } from 'react-native';
import { ChoiceChip } from './ChoiceChip';
import { Text } from './Text';

type Option<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
  label?: string;
  options: Option<T>[];
  values: T[];
  onChange: (values: T[]) => void;
  disabled?: boolean;
};

/** Velg flere verdier (f.eks. ukedager). Rekkefølgen i resultatet følger options. */
export function MultiChoiceChips<T extends string | number>({ label, options, values, onChange, disabled }: Props<T>) {
  function toggle(value: T) {
    const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)));
  }

  return (
    <View style={styles.wrapper}>
      {label && <Text variant="label">{label}</Text>}
      <View style={styles.row}>
        {options.map((option) => (
          <ChoiceChip
            key={option.value}
            label={option.label}
            selected={values.includes(option.value)}
            onPress={() => toggle(option.value)}
            disabled={disabled}
            role="checkbox"
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
