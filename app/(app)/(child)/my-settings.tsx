import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, colors, Message, personColor, spacing, Text } from '../../../src/ui';
import { signOutChildDevice } from '../../../src/features/devices/api';
import { AvatarPicker } from '../../../src/features/household/components/AvatarPicker';
import { useMyHousehold, useMyMember, useSetMyAvatar } from '../../../src/features/household/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';

/**
 * «Innstillinger» på barnets enhet: navnet (bare visning), ny avatar, og utlogging.
 * Navnet endres av en voksen. Avataren lagres med en gang barnet trykker på en ny.
 */
export default function ChildSettingsScreen() {
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const me = useMyMember(householdId);
  const setAvatar = useSetMyAvatar(householdId);
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
        <Avatar avatar={me.avatar} size={100} ring={personColor(me.avatar).ring} />
        <Text variant="sectionTitle">{me.display_name}</Text>
        <Text variant="meta" color={colors.textMuted}>Navnet kan en voksen endre.</Text>
      </View>

      <AvatarPicker
        value={me.avatar}
        onChange={(avatar) => avatar !== me.avatar && setAvatar.mutate(avatar)}
        disabled={setAvatar.isPending}
      />
      {setAvatar.error && <Message>{toNorwegianMessage(setAvatar.error)}</Message>}

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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.page, gap: spacing.section + 2, paddingBottom: 48 },
  header: { alignItems: 'center', gap: 6 },
  signOut: { gap: 8, marginTop: 24 },
});
