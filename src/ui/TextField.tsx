import { useId } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Text } from './Text';
import { colors, fonts, minTouch, radius } from './theme';

type Props = TextInputProps & {
  label?: string;
  /** Stor, sentrert tekst med luft mellom tegnene, til koder («ABCD-EFGH», «123456»). */
  code?: boolean;
};

// iOS' talltastatur har ingen returknapp. Da legger vi en «Ferdig»-linje over tastaturet.
const KEYPADS_WITHOUT_RETURN = ['number-pad', 'numeric', 'decimal-pad', 'phone-pad'];

/**
 * TextInput med valgfri etikett over. Alle vanlige TextInput-props sendes videre.
 * «Ferdig» på tastaturet lukker det (returnKeyType done; enlinjefelt blurer da av seg selv).
 * Tekstfargen er fast, så teksten også synes når telefonen er i mørk modus.
 */
export function TextField({ label, code, style, ...inputProps }: Props) {
  const accessoryId = useId();
  const needsAccessory =
    Platform.OS === 'ios' && KEYPADS_WITHOUT_RETURN.includes(inputProps.keyboardType ?? '');

  return (
    <View style={styles.wrapper}>
      {label && <Text variant="label">{label}</Text>}
      <TextInput
        style={[styles.input, code && styles.code, style]}
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        inputAccessoryViewID={needsAccessory ? accessoryId : undefined}
        accessibilityLabel={label}
        {...inputProps}
      />
      {needsAccessory && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.accessory}>
            <Pressable onPress={Keyboard.dismiss} accessibilityRole="button" hitSlop={8}>
              <Text variant="bodyStrong" color={colors.primary}>Ferdig</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  input: {
    minHeight: minTouch + 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.row,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  code: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: 4, textAlign: 'center' },
  accessory: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
});
