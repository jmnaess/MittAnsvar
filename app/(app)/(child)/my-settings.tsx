import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../src/components/Avatar';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/components/theme';
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar avatar={me.avatar} size={56} />
        <View>
          <Text style={styles.name}>{me.display_name}</Text>
          <Text style={styles.muted}>Navnet kan en voksen endre.</Text>
        </View>
      </View>

      <AvatarPicker
        value={me.avatar}
        onChange={(avatar) => avatar !== me.avatar && setAvatar.mutate(avatar)}
        disabled={setAvatar.isPending}
      />
      {setAvatar.error && <Text style={styles.error}>{toNorwegianMessage(setAvatar.error)}</Text>}

      <View style={styles.signOut}>
        <Button
          variant="danger"
          title="Logg ut av denne enheten"
          onPress={confirmSignOut}
          disabled={signingOut}
        />
        {signOutError && <Text style={styles.error}>{signOutError}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 20, backgroundColor: colors.background, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  error: { color: colors.danger, fontSize: 15 },
  signOut: { gap: 8, marginTop: 24 },
});
