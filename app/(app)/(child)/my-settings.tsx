import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, ChoiceChips, makeStyles, Message, spacing, Text, useTheme } from '../../../src/ui';
import { AppearanceSection } from '../../../src/features/appearance/AppearanceSection';
import { signOutChildDevice } from '../../../src/features/devices/api';
import { AvatarPicker } from '../../../src/features/household/components/AvatarPicker';
import { MemberAvatar } from '../../../src/features/household/components/MemberAvatar';
import {
  useMyHousehold,
  useMyMember,
  useSetMyAvatar,
  useSetMyAvatarMode,
} from '../../../src/features/household/hooks';
import { AVATAR_MODE_OPTIONS } from '../../../src/features/household/photo';
import { toNorwegianMessage } from '../../../src/lib/errors';

/**
 * «Innstillinger» på barnets enhet: navnet (bare visning), ny avatar, figur eller bilde, utseende
 * (lys/mørk) og utlogging.
 * Navnet endres av en voksen. Avataren lagres med en gang barnet trykker på en ny.
 * Bildet legges inn og fjernes av en voksen. Barnet kan bare velge om det vises.
 */
export default function ChildSettingsScreen() {
  const { colors, personColor } = useTheme();
  const styles = useStyles();
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const me = useMyMember(householdId);
  const setAvatar = useSetMyAvatar(householdId);
  const setMode = useSetMyAvatarMode(householdId);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (!me) return null;

  function confirmSignOut() {
    Alert.alert(
      'Logge ut av denne enheten?',
      'Du blir logget ut, og en voksen må koble til enheten på nytt.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Logg ut', style: 'destructive', onPress: signOut },
      ],
    );
  }

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOutChildDevice();
    } catch (e) {
      setSignOutError(toNorwegianMessage(e));
      setSigningOut(false);
    }
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <MemberAvatar member={me} size={100} ring={personColor(me.avatar).ring} />
        <Text variant="sectionTitle">{me.display_name}</Text>
        <Text variant="meta" color={colors.textMuted}>Navnet kan en voksen endre.</Text>
      </View>

      <AvatarPicker
        value={me.avatar}
        onChange={(avatar) => avatar !== me.avatar && setAvatar.mutate(avatar)}
        disabled={setAvatar.isPending}
      />
      {setAvatar.error && <Message>{toNorwegianMessage(setAvatar.error)}</Message>}

      {me.photo_path && (
        <ChoiceChips
          label="Vis meg som"
          options={AVATAR_MODE_OPTIONS}
          value={me.avatar_mode}
          onChange={(mode) => mode !== me.avatar_mode && setMode.mutate(mode)}
          disabled={setMode.isPending}
        />
      )}
      {setMode.error && <Message>{toNorwegianMessage(setMode.error)}</Message>}

      <AppearanceSection />

      <View style={styles.signOut}>
        <Button
          variant="danger"
          title="Logg ut av denne enheten"
          onPress={confirmSignOut}
          disabled={signingOut}
        />
        {signOutError && <Message>{signOutError}</Message>}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { padding: spacing.page, gap: spacing.section + 2, paddingBottom: 48 },
    header: { alignItems: 'center', gap: 6 },
    signOut: { gap: 8, marginTop: 24 },
  }),
);
