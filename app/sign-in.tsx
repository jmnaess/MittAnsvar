import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendCode, toNorwegianMessage, verifyCode } from '../src/features/auth/api';

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
        <Text style={styles.title}>MittAnsvar</Text>

        {step === 'email' ? (
          <>
            <Text style={styles.label}>Logg inn med e-post. Vi sender deg en kode.</Text>
            <TextInput
              style={styles.input}
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
            <PrimaryButton
              title="Send kode"
              onPress={handleSendCode}
              disabled={busy || !trimmedEmail.includes('@')}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Skriv inn koden vi sendte til {trimmedEmail}.</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
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
            <PrimaryButton
              title="Logg inn"
              onPress={handleVerify}
              disabled={busy || code.length !== CODE_LENGTH}
            />
            <View style={styles.links}>
              <LinkButton title="Send ny kode" onPress={handleResend} disabled={busy} />
              <LinkButton title="Bruk en annen e-post" onPress={handleChangeEmail} disabled={busy} />
            </View>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ButtonProps = { title: string; onPress: () => void; disabled?: boolean };

function PrimaryButton({ title, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.buttonDisabled]}
      accessibilityRole="button"
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

function LinkButton({ title, onPress, disabled }: ButtonProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button">
      <Text style={[styles.link, disabled && styles.linkDisabled]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 16, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  button: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  link: { color: '#2563eb', fontSize: 15, paddingVertical: 8 },
  linkDisabled: { opacity: 0.5 },
  error: { color: '#b91c1c', fontSize: 15 },
  info: { color: '#15803d', fontSize: 15 },
});
