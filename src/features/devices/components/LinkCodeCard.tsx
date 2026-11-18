import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { makeStyles, radius, Text, useTheme } from '../../../ui';
import { formatInviteCode } from '../../household/inviteCode';
import { formatTimeLeft, linkCodeUrl } from '../linkCode';

type Props = { code: string; expiresAt: string; onExpired: () => void };

/** QR-kode, koden i tekst og hvor lenge den gjelder. */
export function LinkCodeCard({ code, expiresAt, onExpired }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const now = useNow();
  const expired = new Date(expiresAt).getTime() <= now;

  useEffect(() => {
    if (expired) onExpired();
  }, [expired, onExpired]);

  return (
    <View style={styles.card}>
      {/* Alltid mørk på lys, også i mørkt tema: mange skannere leser ikke invertert QR. quietZone gir
          den lyse kanten skannere trenger rundt koden. */}
      <QRCode
        value={linkCodeUrl(code)}
        size={220}
        color={colors.qrInk}
        backgroundColor={colors.qrBg}
        quietZone={12}
      />
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

const useStyles = makeStyles(({ colors, shadow }) =>
  StyleSheet.create({
    card: { alignItems: 'center', gap: 8, padding: 24, borderRadius: radius.card, backgroundColor: colors.surface, ...shadow },
    or: { marginTop: 8 },
  }),
);
