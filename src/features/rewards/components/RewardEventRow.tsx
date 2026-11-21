import { StyleSheet } from 'react-native';
import { formatDateTime } from '../../../lib/dates';
import { Chip, ListRow, Text, useTheme } from '../../../ui';
import { formatKroner } from '../../tasks/reward';
import type { RewardEvent } from '../api';
import { extraRewardText, extraRewardTitle } from '../format';

/**
 * Én linje i historikken: «Henge opp vask  +15 kr», «Ekstra for at du hjalp Thelma  +50 kr»
 * eller «Utbetalt  −20 kr».
 * Steg 10b: «Venter» som merkelapp, eller «Ikke godkjent» med gjennomstreket beløp (teller ikke).
 * onPress: en voksen kan trykke for å endre lønnen eller fjerne ekstra lønn (utelatt = bare visning).
 */
export function RewardEventRow({ event, onPress }: { event: RewardEvent; onPress?: () => void }) {
  const { colors } = useTheme();
  const earned = event.kind === 'earned';
  const plus = event.kind !== 'paid';
  const pending = earned && event.status === 'pending';
  const rejected = earned && event.status === 'rejected';
  const title =
    event.kind === 'earned' ? event.title : event.kind === 'extra' ? extraRewardTitle(event.reason) : 'Utbetalt';
  return (
    <ListRow
      title={title}
      meta={formatDateTime(event.at)}
      onPress={onPress}
      accessibilityLabel={event.kind === 'extra' ? extraRewardText(event.amount, event.reason) : undefined}
      accessibilityHint={onPress ? (event.kind === 'extra' ? 'Fjern ekstra lønn' : 'Endre lønn') : undefined}
      badge={
        pending ? <Chip label="Venter" tone="money" /> : rejected ? <Chip label="Ikke godkjent" tone="overdue" /> : undefined
      }
      right={
        <Text
          variant="rowTitle"
          color={plus && !rejected ? colors.moneyText : colors.textMuted}
          style={rejected && styles.struck}
        >
          {plus ? '+' : '−'}
          {formatKroner(event.amount)}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  struck: { textDecorationLine: 'line-through' },
});
