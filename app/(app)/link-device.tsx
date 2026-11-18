import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  ChoiceChips,
  makeStyles,
  Message,
  spacing,
  Text,
  TextField,
  useTheme,
} from '../../src/ui';
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
  const styles = useStyles();
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
        <Text variant="pageTitle">Koble til</Text>
        <Text>
          Be en voksen åpne deg under «Husstand» og trykke «Koble til enhet».
        </Text>

        <ChoiceChips options={MODE_OPTIONS} value={mode} onChange={changeMode} disabled={redeem.isPending} />

        {mode === 'scan' ? (
          <>
            <QrScanner onCode={submit} paused={redeem.isPending} />
            {redeem.isPending && <Text>Kobler til …</Text>}
          </>
        ) : (
          <View style={styles.manual}>
            {/* TextField setter tekstfargen, så teksten også synes i mørk modus. */}
            <TextField
              label="Koden fra den voksnes mobil"
              code
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

        {redeem.error && <Message>{toNorwegianMessage(redeem.error)}</Message>}

        <Button variant="text" title="Avbryt" onPress={() => signOutLocal()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { padding: spacing.page, gap: 16 },
    manual: { gap: 12 },
  }),
);
