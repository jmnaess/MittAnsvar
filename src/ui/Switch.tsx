import { Switch as RNSwitch, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { minTouch } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Leses opp av skjermleser. Vises også som tekst til venstre når label er satt. */
  accessibilityLabel: string;
  /** Satt = en hel rad med tekst til venstre og bryteren til høyre. */
  label?: string;
};

/** Bryter i primary-farge. Med label: en rad med teksten til venstre. */
export function Switch({ value, onValueChange, disabled, accessibilityLabel, label }: Props) {
  const { colors } = useTheme();
  const toggle = (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: colors.primary, false: colors.borderStrong }}
      thumbColor={colors.switchThumb}
      ios_backgroundColor={colors.borderStrong}
    />
  );
  if (!label) return toggle;
  return (
    <View style={styles.row}>
      <Text variant="bodyStrong" style={styles.label}>{label}</Text>
      {toggle}
    </View>
  );
}

/**
 * Tom plass med nøyaktig bryterens størrelse, for rader uten bryter i en liste der de andre har
 * det (årshjulet). En usynlig bryter i stedet for en fast bredde, fordi bryteren er ulik på iOS og
 * Android. Kan ikke trykkes, og skjermlesere hopper over den.
 */
export function SwitchSpacer() {
  return (
    <View
      style={styles.spacer}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <RNSwitch value={false} disabled />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: minTouch },
  label: { flex: 1 },
  spacer: { opacity: 0 },
});
