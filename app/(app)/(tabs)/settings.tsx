import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import {
  Button,
  ChoiceChips,
  colors,
  ListRow,
  Message,
  Section,
  spacing,
  Text,
  TextField,
} from '../../../src/ui';
import { deleteAccount, signOut } from '../../../src/features/auth/api';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { hasAnyAnswer } from '../../../src/features/household/homeProfile';
import { useMyHousehold, useMyMember, useUpdateHousehold } from '../../../src/features/household/hooks';
import { FEEDBACK_TONE_OPTIONS } from '../../../src/features/household/labels';
import type { Household } from '../../../src/features/household/types';
import { ReminderSettingsSection } from '../../../src/features/notifications/components/ReminderSettingsSection';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function SettingsScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { session } = useSession();

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <HouseholdSection household={household!} />
      <HomeSection household={household!} />
      <Section title="Påminnelser">
        <ReminderSettingsSection userId={session!.user.id} />
      </Section>
      <AccountSection />
    </ScrollView>
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
        {saved && <Message tone="success">Navnet er lagret.</Message>}
      </Section>

      <Section
        title="Tilbakemeldinger"
        description="Etter en fullført oppgave viser vi en kort tekst. Velg hva slags."
      >
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

      {update.error && <Message>{toNorwegianMessage(update.error)}</Message>}
    </>
  );
}

/** «Hjemmet»: hjemprofilen. Bare voksne ser raden (barn kan lese profilen, men ikke endre den). */
function HomeSection({ household }: { household: Household }) {
  const me = useMyMember(household.id);
  if (me?.role !== 'adult') return null;

  return (
    <Section title="Hjemmet" description="Svar på noen spørsmål om boligen, så foreslår vi vedlikehold.">
      <ListRow
        title="Om hjemmet"
        meta={hasAnyAnswer(household) ? 'Endre svar og se nye forslag' : 'Ikke svart ennå'}
        onPress={() => router.push('/home-profile')}
      />
    </Section>
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
      <Text variant="meta" color={colors.textMuted}>Innlogget som</Text>
      <Text variant="bodyStrong" style={styles.email}>{session?.user.email}</Text>
      <Button variant="secondary" title="Logg ut" onPress={confirmSignOut} disabled={busy} />
      <Button variant="danger" title="Slett konto" onPress={confirmDeleteAccount} disabled={busy} />
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.page, gap: spacing.section + 10, paddingBottom: 48 },
  email: { marginTop: -8, marginBottom: 4 },
});
