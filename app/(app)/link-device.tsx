import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { ChoiceChips } from '../../src/components/ChoiceChips';
import { TextField } from '../../src/components/TextField';
import { colors } from '../../src/components/theme';
import { signOutLocal } from '../../src/features/auth/api';
import { QrScanner } from '../../src/features/devices/components/QrScanner';
import { useRedeemLinkCode } from '../../src/features/devices/hooks';
import { LINK_CODE_LENGTH, parseLinkCode } from '../../src/features/devices/linkCode';
import { toNorwegianMessage } from '../../src/lib/errors';

type Mode = 'scan' | 'type';

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'scan', label: 'Skann QR-kode' },
  { value: 'type', label: 'Skriv inn kode' },
];

/**
 * Barnets enhet, før den er koblet til en barneprofil (anonym innlogging, se app/(app)/_layout.tsx).
 * To valg: skann QR-koden på den voksnes mobil (standard), eller skriv inn koden.
 *
 * «Skriv inn kode» skjuler kameraet, så feltet står øverst og alltid er over tastaturet.
 * Med kameraet over feltet ble feltet liggende under tastaturet.
 * Når koden er godtatt, hentes husstanden på nytt og layouten viser barnets faner.
 */
export default function LinkDeviceScreen() {
  const redeem = useRedeemLinkCode();
  const [mode, setMode] = useState<Mode>('scan');
  const [typed, setTyped] = useState('');
  const typedCode = parseLinkCode(typed);

  function submit(code: string) {
    if (redeem.isPending) return;
    redeem.mutate(code);
  }

  function changeMode(next: Mode) {
    redeem.reset();
    setMode(next);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.title}>Koble til</Text>
        <Text style={styles.text}>
          Be en voksen åpne deg under «Husstand» og trykke «Koble til enhet».
        </Text>

        <ChoiceChips options={MODE_OPTIONS} value={mode} onChange={changeMode} disabled={redeem.isPending} />

        {mode === 'scan' ? (
          <>
            <QrScanner onCode={submit} paused={redeem.isPending} />
            {redeem.isPending && <Text style={styles.text}>Kobler til …</Text>}
          </>
        ) : (
          <View style={styles.manual}>
            {/* TextField setter tekstfargen, så teksten også synes i mørk modus. */}
            <TextField
              label="Koden fra den voksnes mobil"
              style={styles.input}
              value={typed}
              onChangeText={setTyped}
              placeholder="ABCD-EFGH"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              maxLength={LINK_CODE_LENGTH + 1}
              editable={!redeem.isPending}
              onSubmitEditing={() => typedCode && submit(typedCode)}
            />
            <Button
              title={redeem.isPending ? 'Kobler til …' : 'Koble til'}
              onPress={() => typedCode && submit(typedCode)}
              disabled={!typedCode || redeem.isPending}
            />
          </View>
        )}

        {redeem.error && <Text style={styles.error}>{toNorwegianMessage(redeem.error)}</Text>}

        <Button variant="link" title="Avbryt" onPress={() => signOutLocal()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  text: { fontSize: 16, color: colors.text },
  manual: { gap: 12 },
  input: { fontSize: 22, letterSpacing: 4, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 15 },
});
