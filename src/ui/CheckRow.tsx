import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox } from './Checkbox';
import { InfoButton } from './InfoButton';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { minTouch, radius } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  title: string;
  meta?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Satt: (i)-ikon til høyre som åpner «Slik gjør du». Trykk på raden velger som før. */
  onInfoPress?: () => void;
  /** Tekst til skjermleseren for (i). Utelatt = «Slik gjør du: …». */
  infoLabel?: string;
  /** Under metalinjen, f.eks. en brikke som endrer hyppigheten. Egne trykk går til den. */
  below?: ReactNode;
  /**
   * Tettere rad til lange lister: lavere og mindre luft (fortsatt minst 44 px), og meta på samme
   * linje som below. Brukes i «Forslag til hverdagen».
   */
  compact?: boolean;
};

/**
 * Rad for å velge ting i en liste (f.eks. forslag som skal legges til). Ligner TaskRow, men
 * avkrysset betyr «valgt», ikke «gjort»: ingen gjennomstreking. Hele raden er ett trykk.
 */
export function CheckRow({
  title,
  meta,
  checked,
  onToggle,
  disabled,
  onInfoPress,
  infoLabel,
  below,
  compact,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const metaText = meta ? <Text variant="meta" color={colors.textMuted}>{meta}</Text> : null;
  const metaInline = compact && !!below;
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={meta ? `${title}. ${meta}` : title}
      style={({ pressed }) => [
        styles.row,
        compact && styles.compact,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Checkbox checked={checked} />
      <View style={styles.text}>
        <Text variant="rowTitle">{title}</Text>
        {!metaInline && metaText}
        {below ? (
          <View style={[styles.below, compact && styles.belowCompact]}>
            {below}
            {metaInline && metaText}
          </View>
        ) : null}
      </View>
      {onInfoPress && <InfoButton onPress={onInfoPress} title={title} accessibilityLabel={infoLabel} />}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: minTouch + 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radius.row,
      backgroundColor: colors.surface,
    },
    // minTouch alene (44) er nok: tittelen + brikken (32 px + hitSlop) er høyere enn det uansett.
    compact: { minHeight: minTouch, paddingVertical: 6 },
    pressed: { backgroundColor: colors.surfaceMuted },
    disabled: { opacity: 0.6 },
    text: { flex: 1, gap: 1 },
    below: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
    belowCompact: { marginTop: 4 },
  }),
);
