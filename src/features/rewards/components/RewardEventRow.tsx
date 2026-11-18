import { StyleSheet } from 'react-native';
import { formatDateTime } from '../../../lib/dates';
import { Chip, ListRow, Text, useTheme } from '../../../ui';
import { formatKroner } from '../../tasks/reward';
import type { RewardEvent } from '../api';

/**
 * Én linje i historikken: «Henge opp vask  +15 kr» eller «Utbetalt  −20 kr».
 * Steg 10b: «Venter» som merkelapp, eller «Ikke godkjent» med gjennomstreket beløp (teller ikke).
 * onPress: en voksen kan trykke for å endre godkjenning (utelatt = bare visning).
 */
export function RewardEventRow({ event, onPress }: { event: RewardEvent; onPress?: () => void }) {
  const { colors } = useTheme();
  const earned = event.kind === 'earned';
  const pending = earned && event.status === 'pending';
  const rejected = earned && event.status === 'rejected';
  return (
    <ListRow
      title={earned ? event.title : 'Utbetalt'}
      meta={formatDateTime(event.at)}
      onPress={onPress}
      accessibilityHint={onPress ? 'Endre godkjenning' : undefined}
      badge={
        pending ? <Chip label="Venter" tone="money" /> : rejected ? <Chip label="Ikke godkjent" tone="overdue" /> : undefined
      }
      right={
        <Text
          variant="rowTitle"
          color={earned && !rejected ? colors.moneyText : colors.textMuted}
          style={rejected && styles.struck}
        >
          {earned ? '+' : '−'}
          {formatKroner(event.amount)}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  struck: { textDecorationLine: 'line-through' },
});
