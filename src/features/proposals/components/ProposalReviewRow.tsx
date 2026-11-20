import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Hint, makeStyles, radius, Text, TextField, useTheme } from '../../../ui';
import { MemberAvatar } from '../../household/components/MemberAvatar';
import type { Member } from '../../household/types';
import { formatKroner, MAX_REWARD_NOK } from '../../tasks/reward';
import type { PendingProposal } from '../api';
import { parseAmount, proposalMeta } from '../format';

type Props = {
  proposal: PendingProposal;
  member: Member | undefined;
  busy: boolean;
  onDecide: (approve: boolean, amountNok: number | null) => void;
};

/**
 * Ett forslag i «Spør om lønn»: «Leah · Gjort · ønsker 30 kr», «Fortjent lønn» (forhåndsutfylt med
 * barnets beløp, tomt eller 0 = ingen lønn), «Avslå» (bekreftes) og «Godkjenn» (med beløp) eller
 * «Godkjenn uten lønn».
 */
export function ProposalReviewRow({ proposal, member, busy, onDecide }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [amount, setAmount] = useState(proposal.proposed_nok ? String(proposal.proposed_nok) : '');
  const parsed = parseAmount(amount, MAX_REWARD_NOK);
  const name = member?.display_name ?? 'Barnet';

  function confirmReject() {
    Alert.alert(`Avslå «${proposal.title}»?`, `${name} ser «Ikke denne gangen».`, [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Avslå', style: 'destructive', onPress: () => onDecide(false, null) },
    ]);
  }

  const approveHint = proposal.is_done
    ? `Registreres som gjort av ${name}${parsed ? `, med ${formatKroner(parsed)}` : ''}.`
    : `Blir en oppgave til ${name} i dag${parsed ? `, med ${formatKroner(parsed)}` : ''}.`;

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        {member && <MemberAvatar member={member} size={32} />}
        <View style={styles.flex}>
          <Text variant="rowTitle">{proposal.title}</Text>
          <Text variant="meta" color={colors.textMuted}>
            {name} · {proposalMeta(proposal)}
          </Text>
        </View>
      </View>
      <TextField
        label="Fortjent lønn"
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={5}
        placeholder="Beløp i kr"
        editable={!busy}
      />
      <Hint error={parsed === null}>
        {parsed === null ? `Beløpet kan være opptil ${formatKroner(MAX_REWARD_NOK)}.` : approveHint}
      </Hint>
      <View style={styles.actions}>
        <Button title="Avslå" variant="secondary" small onPress={confirmReject} disabled={busy} />
        <Button
          title={parsed ? 'Godkjenn' : 'Godkjenn uten lønn'}
          small
          onPress={() => onDecide(true, parsed || null)}
          disabled={busy || parsed === null}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    row: { backgroundColor: colors.surfaceMuted, borderRadius: radius.row, padding: 12, gap: 10 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    flex: { flex: 1 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  }),
);
