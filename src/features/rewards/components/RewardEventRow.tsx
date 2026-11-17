import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../components/theme';
import { formatDateTime } from '../../../lib/dates';
import { formatKroner } from '../../tasks/reward';
import type { RewardEvent } from '../api';

/** Én linje i historikken: «Henge opp vask  +15 kr» eller «Utbetalt  −20 kr». */
export function RewardEventRow({ event }: { event: RewardEvent }) {
  const earned = event.kind === 'earned';
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{earned ? event.title : 'Utbetalt'}</Text>
        <Text style={styles.detail}>{formatDateTime(event.at)}</Text>
      </View>
      <Text style={earned ? styles.plus : styles.minus}>
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
});
