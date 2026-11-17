import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteAccount, signOut, toNorwegianMessage } from '../../../src/features/auth/api';
import { useSession } from '../../../src/features/auth/SessionProvider';

export default function SettingsScreen() {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);

  // Etter utlogging eller sletting bytter rotlayouten til innloggingsskjermen av seg selv.
  async function run(action: () => Promise<void>, errorTitle: string) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert(errorTitle, toNorwegianMessage(e));
      setBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Logg ut?', 'Du må skrive inn en ny kode fra e-post for å logge inn igjen.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Logg ut', style: 'destructive', onPress: () => run(signOut, 'Kunne ikke logge ut') },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Slette kontoen?',
      'Kontoen og e-postadressen din slettes. Er du den eneste voksne i husstanden, ' +
        'slettes også hele husstanden med barneprofiler, oppgaver og historikk.\n\n' +
        'Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett konto',
          style: 'destructive',
          onPress: () => run(deleteAccount, 'Kunne ikke slette kontoen'),
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Innlogget som</Text>
      <Text style={styles.email}>{session?.user.email}</Text>
      <Pressable
        onPress={confirmSignOut}
        disabled={busy}
        style={[styles.outlineButton, busy && styles.disabled]}
        accessibilityRole="button"
      >
        <Text style={styles.outlineText}>Logg ut</Text>
      </Pressable>
      <Pressable
        onPress={confirmDeleteAccount}
        disabled={busy}
        style={[styles.dangerButton, busy && styles.disabled]}
        accessibilityRole="button"
      >
        <Text style={styles.dangerText}>Slett konto</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  label: { fontSize: 14, color: '#666' },
  email: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#b91c1c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineText: { color: '#b91c1c', fontSize: 16, fontWeight: '600' },
  dangerButton: {
    backgroundColor: '#b91c1c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
