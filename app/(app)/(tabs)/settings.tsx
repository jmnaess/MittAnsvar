import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { signOut, toNorwegianMessage } from '../../../src/features/auth/api';
import { useSession } from '../../../src/features/auth/SessionProvider';

export default function SettingsScreen() {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);

  function confirmSignOut() {
    Alert.alert('Logg ut?', 'Du må skrive inn en ny kode fra e-post for å logge inn igjen.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Logg ut', style: 'destructive', onPress: handleSignOut },
    ]);
  }

  // Etter utlogging bytter rotlayouten til innloggingsskjermen av seg selv.
  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Kunne ikke logge ut', toNorwegianMessage(e));
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Innlogget som</Text>
      <Text style={styles.email}>{session?.user.email}</Text>
      <Pressable
        onPress={confirmSignOut}
        disabled={busy}
        style={[styles.button, busy && styles.buttonDisabled]}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Logg ut</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  label: { fontSize: 14, color: '#666' },
  email: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  button: {
    borderWidth: 1,
    borderColor: '#b91c1c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#b91c1c', fontSize: 16, fontWeight: '600' },
});
