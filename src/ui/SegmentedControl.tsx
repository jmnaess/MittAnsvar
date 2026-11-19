import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { radius } from './theme';
import { useTheme } from './ThemeProvider';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

const PADDING = 3;

/** Segmentert kontroll i full bredde, f.eks. «Kategori | Person». Valgt segment er en løftet flate. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.track} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text variant="segment" color={selected ? colors.text : colors.textMuted}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      padding: PADDING,
      borderRadius: radius.segment,
      backgroundColor: colors.segmentBg,
    },
    segment: {
      flex: 1,
      minHeight: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.segment - PADDING,
    },
    selected: { backgroundColor: colors.segmentSelected, ...shadow },
  }),
);
