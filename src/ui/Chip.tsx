import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { radius, type ThemeColors } from './theme';
import { useTheme } from './ThemeProvider';

export type ChipTone = 'money' | 'overdue' | 'neutral';

function toneColors(colors: ThemeColors, tone: ChipTone): { bg: string; fg: string } {
  switch (tone) {
    case 'money': return { bg: colors.moneyBg, fg: colors.moneyText };
    case 'overdue': return { bg: colors.overdueBg, fg: colors.overdueText };
    case 'neutral': return { bg: colors.surfaceMuted, fg: colors.textMuted };
  }
}

/** Liten merkelapp, f.eks. «15 kr» eller «Forfalt». Bare visning. */
export function Chip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  const { bg, fg } = toneColors(useTheme().colors, tone);
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text variant="label" color={fg}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radius.chip, paddingHorizontal: 9, paddingVertical: 4 },
});
