import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../../components/theme';
import { formatInviteCode } from '../../household/inviteCode';
import { formatTimeLeft, linkCodeUrl } from '../linkCode';

type Props = { code: string; expiresAt: string; onExpired: () => void };

/** QR-kode, koden i tekst og hvor lenge den gjelder. */
export function LinkCodeCard({ code, expiresAt, onExpired }: Props) {
  const now = useNow();
  const expired = new Date(expiresAt).getTime() <= now;

  useEffect(() => {
    if (expired) onExpired();
  }, [expired, onExpired]);

  return (
    <View style={styles.card}>
      <QRCode value={linkCodeUrl(code)} size={220} />
      <Text style={styles.or}>eller tast inn</Text>
      <Text style={styles.code} selectable accessibilityLabel={`Kode ${code.split('').join(' ')}`}>
        {formatInviteCode(code)}
      </Text>
      <Text style={styles.timer}>Gjelder i {formatTimeLeft(expiresAt, now)}</Text>
    </View>
  );
}

/** Tiden nå, oppdatert hvert sekund (til nedtellingen). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  or: { fontSize: 14, color: colors.muted, marginTop: 8 },
  code: { fontSize: 32, fontWeight: '700', letterSpacing: 4, color: colors.text },
  timer: { fontSize: 15, color: colors.muted },
});
