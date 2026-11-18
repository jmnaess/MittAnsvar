import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, minTouch, radius } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'text';

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Mindre knapp i rader og bannere. Fortsatt minst 44 px høy. */
  small?: boolean;
};

/** Pilleknapp. primary = fylt, secondary = med kant, text = bare tekst. */
export function Button({ title, onPress, variant = 'primary', disabled, small }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        variant === 'primary' && { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
        variant === 'secondary' && [styles.secondary, pressed && styles.secondaryPressed],
        variant === 'text' && [styles.text, pressed && styles.textPressed],
        disabled && styles.disabled,
      ]}
    >
      <Text
        variant={small ? 'label' : 'bodyStrong'}
        color={variant === 'primary' ? colors.onPrimary : colors.primary}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouch + 4,
    borderRadius: radius.button,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: minTouch, paddingHorizontal: 14 },
  secondary: { borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  secondaryPressed: { backgroundColor: colors.surfaceMuted },
  text: { paddingHorizontal: 8 },
  textPressed: { opacity: 0.6 },
  disabled: { opacity: 0.5 },
});
