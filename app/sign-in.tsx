import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarStack, Button, colors, Message, spacing, Text, TextField } from '../src/ui';
import { sendCode, verifyCode } from '../src/features/auth/api';
import { signInAsChild } from '../src/features/devices/api';
import { toNorwegianMessage } from '../src/lib/errors';

const CODE_LENGTH = 6;

// Trinn 1: skriv e-post og få kode. Trinn 2: skriv koden.
// Ved vellykket innlogging bytter rotlayouten til fanene av seg selv.
export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (e) {
      setError(toNorwegianMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const handleSendCode = () =>
    run(async () => {
      await sendCode(trimmedEmail);
      setCode('');
      setStep('code');
    });

  const handleResend = () =>
    run(async () => {
      await sendCode(trimmedEmail);
      setInfo('Ny kode er sendt.');
    });

  const handleVerify = () => run(() => verifyCode(trimmedEmail, code));

  // Barnets enhet: logger inn anonymt. Etterpå viser appen «Koble til» (app/(app)/link-device.tsx).
  const handleChild = () => run(signInAsChild);

  function handleChangeEmail() {
    setStep('email');
    setCode('');
    setError(null);
    setInfo(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brand}>
          <AvatarStack people={['fox', 'cat', 'bear', 'frog'].map((avatar) => ({ avatar }))} size={48} />
          <Text variant="pageTitle" style={styles.center}>MittAnsvar</Text>
        </View>

        {step === 'email' ? (
          <>
            <TextField
              label="Logg inn med e-post. Vi sender deg en kode."
              value={email}
              onChangeText={setEmail}
              placeholder="din@epost.no"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!busy}
              onSubmitEditing={handleSendCode}
              returnKeyType="send"
            />
            <Button
              title="Send kode"
              onPress={handleSendCode}
              disabled={busy || !trimmedEmail.includes('@')}
            />
            <View style={styles.child}>
              <Text variant="meta" color={colors.textMuted} style={styles.center}>
                Har en voksen i familien laget en profil til deg?
              </Text>
              <Button variant="secondary" title="Jeg er et barn" onPress={handleChild} disabled={busy} />
            </View>
          </>
        ) : (
          <>
            <TextField
              label={`Skriv inn koden vi sendte til ${trimmedEmail}.`}
              code
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              autoFocus
              editable={!busy}
            />
            <Button
              title="Logg inn"
              onPress={handleVerify}
              disabled={busy || code.length !== CODE_LENGTH}
            />
            <View style={styles.links}>
              <Button variant="text" title="Send ny kode" onPress={handleResend} disabled={busy} />
              <Button
                variant="text"
                title="Bruk en annen e-post"
                onPress={handleChangeEmail}
                disabled={busy}
              />
            </View>
          </>
        )}

        {error && <Message>{error}</Message>}
        {info && <Message tone="success">{info}</Message>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing.page, gap: 14 },
  brand: { alignItems: 'center', gap: 12, marginBottom: 16 },
  center: { textAlign: 'center' },
  child: { gap: 8, marginTop: 32 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
});
