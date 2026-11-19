import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ChoiceChip, type ChipIconName } from './ChoiceChip';

type Option<T extends string> = { value: T; label: string; left?: ReactNode; icon?: ChipIconName };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Filterbrikker på én rad som kan rulles sidelengs, aldri linjeskift. Samme brikke (ChoiceChip)
 * som i skjemaene. left = f.eks. en Avatar på 20 px.
 */
export function FilterChips<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => (
        <ChoiceChip
          key={option.value}
          label={option.label}
          left={option.left}
          icon={option.icon}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
          role="radio"
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
});
