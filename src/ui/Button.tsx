import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { minTouch, radius } from './theme';
import { useTheme } from './ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Mindre knapp i rader og bannere. Fortsatt minst 44 px høy. */
  small?: boolean;
};

/**
 * Pilleknapp. primary = fylt, secondary = med kant, text = bare tekst,
 * danger = rød, til handlinger som ikke kan angres (slett, logg ut av enheten).
 */
export function Button({ title, onPress, variant = 'primary', disabled, small }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
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
        variant === 'danger' && [styles.danger, pressed && styles.textPressed],
        disabled && styles.disabled,
      ]}
    >
      <Text
        variant={small ? 'label' : 'bodyStrong'}
        color={variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
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
    danger: { backgroundColor: colors.danger },
    disabled: { opacity: 0.5 },
  }),
);
