import { useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { fonts, minTouch, radius } from './theme';
import { useTheme } from './ThemeProvider';

type Props = TextInputProps & {
  label?: string;
  /** Stor, sentrert tekst med luft mellom tegnene, til koder («ABCD-EFGH», «123456»). */
  code?: boolean;
};

// iOS' talltastatur har ingen returknapp. Da viser vi en «Ferdig»-knapp inne i feltet mens det har fokus.
const KEYPADS_WITHOUT_RETURN = ['number-pad', 'numeric', 'decimal-pad', 'phone-pad'];

/**
 * TextInput med valgfri etikett over. Alle vanlige TextInput-props sendes videre.
 * «Ferdig» på tastaturet lukker det (returnKeyType done; enlinjefelt blurer da av seg selv).
 * Farger og tastaturets utseende (iOS) følger temaet.
 */
export function TextField({ label, code, style, onFocus, onBlur, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  const { scheme, colors } = useTheme();
  const styles = useStyles();
  const showDone =
    focused &&
    Platform.OS === 'ios' &&
    KEYPADS_WITHOUT_RETURN.includes(inputProps.keyboardType ?? '');

  return (
    <View style={styles.wrapper}>
      {label && <Text variant="label">{label}</Text>}
      <View>
        <TextInput
          style={[styles.input, code && styles.code, showDone && styles.withDone, showDone && code && styles.withDoneCentered, style]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          keyboardAppearance={scheme}
          returnKeyType="done"
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {showDone && (
          <Pressable
            onPress={Keyboard.dismiss}
            accessibilityRole="button"
            accessibilityLabel="Ferdig"
            style={styles.done}
          >
            <Text variant="bodyStrong" color={colors.primary}>Ferdig</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const DONE_WIDTH = 76;

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
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
    withDone: { paddingRight: DONE_WIDTH },
    // Sentrert kode holder seg midt i feltet når knappen tar plass til høyre.
    withDoneCentered: { paddingLeft: DONE_WIDTH },
    done: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: DONE_WIDTH,
      minHeight: minTouch,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);
