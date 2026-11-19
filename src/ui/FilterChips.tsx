import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { radius } from './theme';
import { useTheme } from './ThemeProvider';

type Option<T extends string> = { value: T; label: string; left?: ReactNode };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Små filterbrikker på én rad som kan rulles sidelengs, aldri linjeskift.
 * Valgt brikke er fylt med primærfargen. left = f.eks. en Avatar på 20 px.
 */
export function FilterChips<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [
              styles.chip,
              option.left ? styles.withLeft : null,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
            ]}
          >
            {option.left}
            <Text variant="label" color={selected ? colors.onPrimary : colors.text}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    row: { gap: 6 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 30,
      paddingHorizontal: 12,
      borderRadius: radius.filterChip,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    withLeft: { paddingLeft: 5 },
    selected: { backgroundColor: colors.primary, borderColor: colors.primary },
    pressed: { backgroundColor: colors.surfaceMuted },
  }),
);
