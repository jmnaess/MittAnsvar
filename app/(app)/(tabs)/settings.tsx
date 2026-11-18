import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  Button,
  ChoiceChips,
  ListRow,
  makeStyles,
  Message,
  Section,
  spacing,
  Text,
  TextField,
  useTheme,
} from '../../../src/ui';
import { AppearanceSection } from '../../../src/features/appearance/AppearanceSection';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { useAccountActions } from '../../../src/features/auth/useAccountActions';
import { hasAnyAnswer } from '../../../src/features/household/homeProfile';
import { useMyHousehold, useMyMember, useUpdateHousehold } from '../../../src/features/household/hooks';
import { FEEDBACK_TONE_OPTIONS } from '../../../src/features/household/labels';
import type { Household } from '../../../src/features/household/types';
import { ReminderSettingsSection } from '../../../src/features/notifications/components/ReminderSettingsSection';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function SettingsScreen() {
  const styles = useStyles();
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
      <AppearanceSection />
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
  const { colors } = useTheme();
  const styles = useStyles();
  const { session } = useSession();
  const { busy, confirmSignOut, confirmDeleteAccount } = useAccountActions();

  return (
    <Section title="Konto">
      <Text variant="meta" color={colors.textMuted}>Innlogget som</Text>
      <Text variant="bodyStrong" style={styles.email}>{session?.user.email}</Text>
      <Button variant="secondary" title="Logg ut" onPress={confirmSignOut} disabled={busy} />
      <Button variant="danger" title="Slett konto" onPress={confirmDeleteAccount} disabled={busy} />
    </Section>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { padding: spacing.page, gap: spacing.section + 10, paddingBottom: 48 },
    email: { marginTop: -8, marginBottom: 4 },
  }),
);
