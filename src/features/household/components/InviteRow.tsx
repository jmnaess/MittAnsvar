import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors } from '../../../components/theme';
import { formatDateTime } from '../../../lib/dates';

type Props = {
  createdByName: string | undefined;
  expiresAt: string;
  busy?: boolean;
  onRevoke: () => void;
};

/** En aktiv invitasjon. Koden kan ikke vises igjen, bare trekkes tilbake. */
export function InviteRow({ createdByName, expiresAt, busy, onRevoke }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>
          {createdByName ? `Invitasjon fra ${createdByName}` : 'Invitasjon'}
        </Text>
        <Text style={styles.detail}>Gyldig til {formatDateTime(expiresAt)}</Text>
      </View>
      <Button variant="link" title="Trekk tilbake" onPress={onRevoke} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  detail: { fontSize: 14, color: colors.muted },
});
