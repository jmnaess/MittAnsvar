import { router, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from './theme';

type Props = {
  /** false = Lagre er grå (ugyldig skjema). Utelatt = ingen Lagre-knapp. */
  canSave?: boolean;
  saving?: boolean;
  onSave?: () => void;
  children: ReactNode;
};

/**
 * Ramme for skjemaer som vises som modal: Avbryt til venstre og Lagre til høyre i headeren,
 * slik iOS-modaler pleier å se ut. Da dekker tastaturet aldri Lagre.
 *
 * Header og tastatur (iOS 26):
 * - headerTransparent: false. Uten egen bakgrunn gjør expo-router headeren gjennomsiktig
 *   (Liquid Glass), og da legges innholdet bak den. Med fast bakgrunn legger react-native-screens
 *   innholdet under headeren på vanlig måte. Avbryt/Lagre beholder glass-utseendet.
 * - contentInsetAdjustmentBehavior="never": iOS skal ikke legge til et eget toppinnrykk. Med
 *   "automatic" kaller React Native scrollTo ved hvert tastaturvarsel, og scrollTo kjenner bare
 *   contentInset (0), ikke det automatiske innrykket. Da hoppet innholdet opp bak headeren.
 * - automaticallyAdjustKeyboardInsets: den eneste tastaturmekanismen. Legger til plass nederst
 *   for tastaturet og scroller bare når feltet med fokus ellers ville blitt dekket.
 * - keyboardShouldPersistTaps="handled": trykk på knapper virker med tastaturet oppe, mens
 *   trykk på tomme flater lukker tastaturet.
 */
export function ModalFormScreen({ canSave, saving, onSave, children }: Props) {
  function save() {
    Keyboard.dismiss();
    onSave?.();
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerLeft: () => <HeaderButton title="Avbryt" onPress={() => router.back()} />,
          headerRight: onSave
            ? () => (
                <HeaderButton title="Lagre" bold onPress={save} disabled={!canSave || saving} />
              )
            : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </>
  );
}

type HeaderButtonProps = { title: string; onPress: () => void; disabled?: boolean; bold?: boolean };

function HeaderButton({ title, onPress, disabled, bold }: HeaderButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={styles.headerButton}
    >
      <Text style={[styles.headerText, bold && styles.bold, disabled && styles.disabled]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  headerButton: { paddingHorizontal: 8 },
  headerText: { fontSize: 17, color: colors.primary },
  bold: { fontWeight: '600' },
  disabled: { color: colors.muted, opacity: 0.6 },
});
