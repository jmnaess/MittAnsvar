import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from './theme';

type Props = TextInputProps & { label?: string };

/** TextInput med valgfri etikett over. Alle vanlige TextInput-props sendes videre. */
export function TextField({ label, style, ...inputProps }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput style={[styles.input, style]} placeholderTextColor="#999" {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 15, color: colors.text, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
