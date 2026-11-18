import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius } from './theme';

type Props = {
  /** Ferdig formatert beløp («20 kr»), eller utelatt for jobber uten lønn. */
  amount?: string;
  title: string;
  /** Hvem jobben er for, f.eks. «Alle barna» eller «Leah · kan gjøres flere ganger». */
  who: string;
  busy?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
};

/** Én ledig jobb i rutenettet: beløpet øverst, så tittel og hvem. Trykk = utført. */
export function JobCard({ amount, title, who, busy, onPress, onLongPress, accessibilityHint }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${title}${amount ? `, ${amount}` : ''}. Marker som utført`}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.card, (pressed || busy) && styles.pressed]}
    >
      {amount && <Text variant="jobAmount" color={colors.jobAmount}>{amount}</Text>}
      <Text variant="jobTitle" color={colors.text}>{title}</Text>
      <Text variant="label" color={colors.jobSub}>{who}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.jobBg,
    borderRadius: radius.card,
    padding: 14,
    gap: 4,
  },
  pressed: { opacity: 0.6 },
});
