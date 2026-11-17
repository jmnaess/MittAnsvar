import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { ChoiceChips } from '../../../src/components/ChoiceChips';
import { TextField } from '../../../src/components/TextField';
import { colors } from '../../../src/components/theme';
import { deleteAccount, signOut } from '../../../src/features/auth/api';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { useMyHousehold, useUpdateHousehold } from '../../../src/features/household/hooks';
import { FEEDBACK_TONE_OPTIONS } from '../../../src/features/household/labels';
import type { Household } from '../../../src/features/household/types';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function SettingsScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <HouseholdSection household={household!} />
      <AccountSection />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function HouseholdSection({ household }: { household: Household }) {
  const update = useUpdateHousehold(household.id);
  const [name, setName] = useState(household.name);
  const [saved, setSaved] = useState(false);

  const trimmed = name.trim();
  const nameChanged = trimmed !== household.name;

  function saveName() {
    setSaved(false);
    update.mutate({ name: trimmed }, { onSuccess: () => setSaved(true) });
  }

  return (
    <>
      <Section title="Husstand">
        <TextField
          label="Navn"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setSaved(false);
          }}
          maxLength={50}
          autoCapitalize="words"
          editable={!update.isPending}
        />
        <Button
          title="Lagre navn"
          onPress={saveName}
          disabled={update.isPending || !nameChanged || trimmed === ''}
        />
        {saved && <Text style={styles.success}>Navnet er lagret.</Text>}
      </Section>

      <Section title="Tilbakemeldinger">
        <Text style={styles.muted}>
          Etter en fullført oppgave viser vi en kort tekst. Velg hva slags.
        </Text>
        <ChoiceChips
          options={FEEDBACK_TONE_OPTIONS}
          // Vis det brukeren trykket på mens lagringen pågår.
          value={update.isPending && update.variables.feedback_tone
            ? update.variables.feedback_tone
            : household.feedback_tone}
          onChange={(tone) => update.mutate({ feedback_tone: tone })}
          disabled={update.isPending}
        />
      </Section>

      {update.error && <Text style={styles.error}>{toNorwegianMessage(update.error)}</Text>}
    </>
  );
}

function AccountSection() {
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
    <Section title="Konto">
      <Text style={styles.muted}>Innlogget som</Text>
      <Text style={styles.email}>{session?.user.email}</Text>
      <Button variant="outline" title="Logg ut" onPress={confirmSignOut} disabled={busy} />
      <Button variant="danger" title="Slett konto" onPress={confirmDeleteAccount} disabled={busy} />
    </Section>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 28 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  email: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  success: { color: colors.success, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15 },
});
