import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from './theme';

type Variant = 'primary' | 'outline' | 'danger' | 'link';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
};

export function Button({ title, onPress, disabled, variant = 'primary' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, styles[variant], disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={[styles.text, textStyles[variant]]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.primary, paddingVertical: 13 },
  danger: { backgroundColor: colors.danger },
  link: { paddingVertical: 8, alignItems: 'flex-start' },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '600' },
});

const textStyles = StyleSheet.create({
  primary: { color: '#fff' },
  outline: { color: colors.primary },
  danger: { color: '#fff' },
  link: { color: colors.primary, fontWeight: '400', fontSize: 15 },
});
