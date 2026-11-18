import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox } from './Checkbox';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { minTouch, radius } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  title: string;
  meta?: string;
  /** Merkelapper til høyre (Chip). «Forfalt» vises her, aldri med dato. */
  right?: ReactNode;
  done?: boolean;
  /** Fyllfarge på sjekkboksen (personens ring-farge). */
  checkColor?: string;
  disabled?: boolean;
  /** Raden ligger i et hvitt kort: bruk surfaceMuted som bakgrunn. */
  muted?: boolean;
  /** Utelatt = bare visning (f.eks. «Gjort siste 3 dager»). */
  onPress?: () => void;
  onLongPress?: () => void;
  /**
   * Satt: sjekkboksen får sitt eget trykk (f.eks. «Merke som ikke gjort?»), og resten av raden
   * bruker onPress. Ikke satt: hele raden er ett trykk.
   */
  onCheckPress?: () => void;
  /** Skjermleser-tekst for sjekkboksen når den har eget trykk. */
  checkAccessibilityLabel?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Én oppgave med sjekkboks: hvit rad, tittel og valgfri metalinje. */
export function TaskRow({
  title, meta, right, done = false, checkColor, disabled, muted, onPress, onLongPress,
  onCheckPress, checkAccessibilityLabel, accessibilityLabel, accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const checkbox = <Checkbox checked={done} color={checkColor} />;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || (!onPress && !onLongPress)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done, disabled: !!disabled || (!onPress && !onLongPress) }}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.row,
        muted && styles.muted,
        pressed && (muted ? styles.mutedPressed : styles.pressed),
      ]}
    >
      {onCheckPress ? (
        // Et indre Pressable tar trykket, så raden rundt ikke også reagerer.
        <Pressable
          onPress={onCheckPress}
          disabled={disabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={checkAccessibilityLabel}
          style={({ pressed }) => pressed && styles.checkPressed}
        >
          {checkbox}
        </Pressable>
      ) : (
        checkbox
      )}
      <View style={styles.text}>
        <Text
          variant="rowTitle"
          color={done ? colors.textMuted : colors.text}
          style={done && styles.strike}
        >
          {title}
        </Text>
        {meta ? <Text variant="meta" color={colors.textMuted}>{meta}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
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
    pressed: { backgroundColor: colors.surfaceMuted },
    muted: { backgroundColor: colors.surfaceMuted },
    mutedPressed: { backgroundColor: colors.border },
    text: { flex: 1, gap: 1 },
    strike: { textDecorationLine: 'line-through' },
    checkPressed: { opacity: 0.6 },
    right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  }),
);
