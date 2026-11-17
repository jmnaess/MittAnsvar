import { useId } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors } from './theme';

type Props = TextInputProps & { label?: string };

// iOS' talltastatur har ingen returknapp. Da legger vi en «Ferdig»-linje over tastaturet.
const KEYPADS_WITHOUT_RETURN = ['number-pad', 'numeric', 'decimal-pad', 'phone-pad'];

/**
 * TextInput med valgfri etikett over. Alle vanlige TextInput-props sendes videre.
 * «Ferdig» på tastaturet lukker det (returnKeyType done; enlinjefelt blurer da av seg selv).
 */
export function TextField({ label, style, ...inputProps }: Props) {
  const accessoryId = useId();
  const needsAccessory =
    Platform.OS === 'ios' && KEYPADS_WITHOUT_RETURN.includes(inputProps.keyboardType ?? '');

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor="#999"
        returnKeyType="done"
        inputAccessoryViewID={needsAccessory ? accessoryId : undefined}
        {...inputProps}
      />
      {needsAccessory && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.accessory}>
            <Pressable onPress={Keyboard.dismiss} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.accessoryButton}>Ferdig</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
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
  accessory: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f1f1f1',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  accessoryButton: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
