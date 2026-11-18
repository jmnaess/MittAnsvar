import { StyleSheet, View } from 'react-native';
import { ChoiceChips, spacing, Text, useTheme } from '../../../ui';
import { HOME_PROFILE_QUESTIONS, HOUSING_TYPE_OPTIONS, SEWAGE_TYPE_OPTIONS } from '../labels';
import type { HomeProfile } from '../types';

type YesNo = 'yes' | 'no';
const YES_NO_OPTIONS: { value: YesNo; label: string }[] = [
  { value: 'yes', label: 'Ja' },
  { value: 'no', label: 'Nei' },
];

const toYesNo = (value: boolean | null): YesNo | null => (value === null ? null : value ? 'yes' : 'no');

type Props = {
  value: HomeProfile;
  onChange: (value: HomeProfile) => void;
  disabled?: boolean;
};

/**
 * Spørsmålene i hjemprofilen. Alle kan hoppes over. Trykk på et valgt svar fjerner det igjen
 * (ubesvart). Boligtype er alltid valgt (påkrevd fra oppstarten).
 */
export function HomeProfileFields({ value, onChange, disabled }: Props) {
  const { colors } = useTheme();
  const set = (changes: Partial<HomeProfile>) => onChange({ ...value, ...changes });

  return (
    <View style={styles.form}>
      <Text variant="hint" color={colors.textMuted}>
        Svar på det du vil. Trykk på et svar igjen for å fjerne det.
      </Text>
      <ChoiceChips
        label="Hvordan bor dere?"
        options={HOUSING_TYPE_OPTIONS}
        value={value.housing_type}
        onChange={(housing_type) => set({ housing_type })}
        disabled={disabled}
      />
      {HOME_PROFILE_QUESTIONS.map(({ key, label }) => (
        <ChoiceChips
          key={key}
          label={label}
          options={YES_NO_OPTIONS}
          value={toYesNo(value[key])}
          onChange={(answer) =>
            set({ [key]: answer === toYesNo(value[key]) ? null : answer === 'yes' })
          }
          disabled={disabled}
        />
      ))}
      <ChoiceChips
        label="Hva slags avløp har dere?"
        options={SEWAGE_TYPE_OPTIONS}
        value={value.sewage_type}
        onChange={(sewage_type) => set({ sewage_type: sewage_type === value.sewage_type ? null : sewage_type })}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.section },
});
