import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox } from './Checkbox';
import { Text } from './Text';
import { colors, minTouch, radius } from './theme';

type Props = {
  title: string;
  meta?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

/**
 * Rad for å velge ting i en liste (f.eks. forslag som skal legges til). Ligner TaskRow, men
 * avkrysset betyr «valgt», ikke «gjort»: ingen gjennomstreking. Hele raden er ett trykk.
 */
export function CheckRow({ title, meta, checked, onToggle, disabled }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={meta ? `${title}. ${meta}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Checkbox checked={checked} />
      <View style={styles.text}>
        <Text variant="rowTitle">{title}</Text>
        {meta ? <Text variant="meta" color={colors.textMuted}>{meta}</Text> : null}
      </View>
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
  disabled: { opacity: 0.6 },
  text: { flex: 1, gap: 1 },
});
