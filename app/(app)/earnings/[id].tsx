import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../src/components/Avatar';
import { Button } from '../../../src/components/Button';
import { ModalFormScreen } from '../../../src/components/ModalFormScreen';
import { colors } from '../../../src/components/theme';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { PayoutModal } from '../../../src/features/rewards/components/PayoutModal';
import { RewardEventRow } from '../../../src/features/rewards/components/RewardEventRow';
import { useBalance, useRecordPayout, useRewardHistory } from '../../../src/features/rewards/hooks';
import { formatKroner } from '../../../src/features/tasks/reward';
import { toNorwegianMessage } from '../../../src/lib/errors';

/** Et barns opptjening: saldo, siste avkrysninger med lønn og utbetalinger, og «Registrer utbetaling». */
export default function EarningsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { data: members } = useMembers(householdId);
  const me = useMyMember(householdId);
  const balance = useBalance(householdId, id);
  const { data: history, error, isPending } = useRewardHistory(householdId, id);
  const payout = useRecordPayout(householdId);
  const [paying, setPaying] = useState(false);

  const child = members?.find((m) => m.id === id && m.role === 'child');
  if (!child) return <ModalFormScreen closeTitle="Lukk">{null}</ModalFormScreen>;

  const isAdult = me?.role === 'adult';

  return (
    <ModalFormScreen closeTitle="Lukk">
      <View style={styles.header}>
        <Avatar avatar={child.avatar} size={48} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{child.display_name}</Text>
          <Text style={styles.balance}>Saldo: {formatKroner(balance)}</Text>
        </View>
      </View>

      {isAdult && balance > 0 && (
        <Button title="Registrer utbetaling" onPress={() => setPaying(true)} disabled={payout.isPending} />
      )}
      {payout.error && <Text style={styles.error}>{toNorwegianMessage(payout.error)}</Text>}
      {error && <Text style={styles.error}>{toNorwegianMessage(error)}</Text>}

      <Text style={styles.sectionTitle}>Siste</Text>
      {!isPending && history?.length === 0 && (
        <Text style={styles.muted}>Ingen oppgaver med lønn ennå. Lønn setter du i oppgaveskjemaet.</Text>
      )}
      {history?.map((event) => <RewardEventRow key={`${event.kind}-${event.id}`} event={event} />)}

      {isAdult && (
        <View style={styles.edit}>
          <Button
            variant="outline"
            title="Endre profil"
            onPress={() => router.push({ pathname: '/child/[id]', params: { id: child.id } })}
          />
        </View>
      )}

      <PayoutModal
        visible={paying}
        childName={child.display_name}
        balance={balance}
        saving={payout.isPending}
        onClose={() => setPaying(false)}
        onConfirm={(amountNok) =>
          payout.mutate({ memberId: child.id, amountNok }, { onSettled: () => setPaying(false) })
        }
      />
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { gap: 2 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  balance: { fontSize: 17, color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  muted: { fontSize: 14, color: colors.muted },
  error: { color: colors.danger, fontSize: 15 },
  edit: { marginTop: 16 },
});
