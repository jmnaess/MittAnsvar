import { StyleSheet, View } from 'react-native';
import { Button, makeStyles, radius, spacing, Text, useTheme } from '../../../ui';
import { openSystemSettings } from '../permissions';

/** Brukeren har sagt nei til varsler. Bare telefonens innstillinger kan endre det. */
export function PermissionBlocked() {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.box}>
      <Text variant="meta" color={colors.textWarm}>
        Varsler er slått av for MittAnsvar på denne telefonen. Slå på varsler i telefonens
        innstillinger, og kom tilbake hit.
      </Text>
      <Button variant="secondary" title="Åpne innstillinger" onPress={() => openSystemSettings()} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    box: { gap: 10, padding: spacing.card, borderRadius: radius.row, backgroundColor: colors.sunSoft },
  }),
);
