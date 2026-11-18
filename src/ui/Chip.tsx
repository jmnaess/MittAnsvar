import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, radius } from './theme';

export type ChipTone = 'money' | 'overdue' | 'neutral';

const tones: Record<ChipTone, { bg: string; fg: string }> = {
  money: { bg: colors.moneyBg, fg: colors.moneyText },
  overdue: { bg: colors.overdueBg, fg: colors.overdueText },
  neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
};

/** Liten merkelapp, f.eks. «15 kr» eller «Forfalt». Bare visning. */
export function Chip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text variant="label" color={fg}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radius.chip, paddingHorizontal: 9, paddingVertical: 4 },
});
