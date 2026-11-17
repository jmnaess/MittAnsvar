import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../components/theme';
import { formatDateTime } from '../../../lib/dates';
import { formatKroner } from '../../tasks/reward';
import type { RewardEvent } from '../api';

/** Tekst etter tidspunktet for avkrysninger som ikke (ennå) er godkjent. */
function statusText(event: RewardEvent): string | null {
  if (event.kind !== 'earned') return null;
  if (event.status === 'pending') return 'Venter på godkjenning';
  if (event.status === 'rejected') return 'Ikke godkjent';
  return null;
}

/**
 * Én linje i historikken: «Henge opp vask  +15 kr» eller «Utbetalt  −20 kr».
 * Steg 10b: «Venter på godkjenning», eller «Ikke godkjent» med gjennomstreket beløp (teller ikke).
 */
export function RewardEventRow({ event }: { event: RewardEvent }) {
  const earned = event.kind === 'earned';
  const rejected = earned && event.status === 'rejected';
  const status = statusText(event);
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{earned ? event.title : 'Utbetalt'}</Text>
        <Text style={styles.detail}>
          {formatDateTime(event.at)}
          {status && <Text style={rejected ? styles.rejected : styles.pending}> · {status}</Text>}
        </Text>
      </View>
      <Text style={rejected ? styles.struck : earned ? styles.plus : styles.minus}>
        {earned ? '+' : '−'}
        {formatKroner(event.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, color: colors.text },
  detail: { fontSize: 13, color: colors.muted },
  plus: { fontSize: 16, fontWeight: '600', color: '#15803d' },
  minus: { fontSize: 16, fontWeight: '600', color: colors.muted },
  struck: { fontSize: 16, fontWeight: '600', color: colors.muted, textDecorationLine: 'line-through' },
  pending: { color: colors.primary },
  rejected: { color: colors.danger },
});
