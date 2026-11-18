import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from './ThemeProvider';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Leses opp av skjermleser. Påkrevd, siden knappen bare har et ikon. */
  accessibilityLabel: string;
  onPress: () => void;
  size?: 40 | 48;
  variant?: 'primary' | 'surface';
  disabled?: boolean;
};

/** Rund ikonknapp. 40 px får ekstra trykkflate (hitSlop) opp til 48. */
export function IconButton({ icon, accessibilityLabel, onPress, size = 48, variant = 'primary', disabled }: Props) {
  const { colors, shadow } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={size < 48 ? 4 : 0}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: primary
            ? (pressed ? colors.primaryPressed : colors.primary)
            : (pressed ? colors.surfaceMuted : colors.surface),
          opacity: disabled ? 0.5 : 1,
        },
        shadow,
      ]}
    >
      <Ionicons name={icon} size={size * 0.55} color={primary ? colors.onPrimary : colors.primary} />
    </Pressable>
  );
}
