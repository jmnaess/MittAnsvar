import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radius, shadow, Text } from '../../../ui';
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
      <QRCode value={linkCodeUrl(code)} size={220} color={colors.text} backgroundColor={colors.surface} />
      <Text variant="meta" color={colors.textMuted} style={styles.or}>eller tast inn</Text>
      <Text variant="code" selectable accessibilityLabel={`Kode ${code.split('').join(' ')}`}>
        {formatInviteCode(code)}
      </Text>
      <Text variant="metaStrong" color={colors.textMuted}>Gjelder i {formatTimeLeft(expiresAt, now)}</Text>
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
  card: { alignItems: 'center', gap: 8, padding: 24, borderRadius: radius.card, backgroundColor: colors.surface, ...shadow },
  or: { marginTop: 8 },
});
