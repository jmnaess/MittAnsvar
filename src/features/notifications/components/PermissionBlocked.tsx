import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors } from '../../../components/theme';
import { openSystemSettings } from '../permissions';

/** Brukeren har sagt nei til varsler. Bare telefonens innstillinger kan endre det. */
export function PermissionBlocked() {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        Varsler er slått av for MittAnsvar på denne telefonen. Slå på varsler i telefonens
        innstillinger, og kom tilbake hit.
      </Text>
      <Button variant="outline" title="Åpne innstillinger" onPress={() => openSystemSettings()} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  text: { fontSize: 15, color: colors.text },
});
