import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox } from './Checkbox';
import { Text } from './Text';
import { colors, minTouch, radius } from './theme';

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
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Én oppgave med sjekkboks: hvit rad, tittel og valgfri metalinje. */
export function TaskRow({
  title, meta, right, done = false, checkColor, disabled, muted, onPress, onLongPress,
  accessibilityLabel, accessibilityHint,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.row,
        muted && styles.muted,
        pressed && (muted ? styles.mutedPressed : styles.pressed),
      ]}
    >
      <Checkbox checked={done} color={checkColor} />
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

const styles = StyleSheet.create({
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
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
