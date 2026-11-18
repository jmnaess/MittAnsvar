import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useUnlinkDevice } from '../../../src/features/devices/hooks';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import type { Member } from '../../../src/features/household/types';
import { PayoutModal } from '../../../src/features/rewards/components/PayoutModal';
import { RewardEventRow } from '../../../src/features/rewards/components/RewardEventRow';
import type { RewardEvent } from '../../../src/features/rewards/api';
import {
  useBalance,
  useRecordPayout,
  useRewardHistory,
  useSetCompletionStatus,
} from '../../../src/features/rewards/hooks';
import { formatBalance } from '../../../src/features/rewards/format';
import { formatKroner } from '../../../src/features/tasks/reward';
import { toNorwegianMessage } from '../../../src/lib/errors';
import {
  Avatar,
  Button,
  Message,
  ModalFormScreen,
  personColor,
  radius,
  Section,
  spacing,
  Text,
} from '../../../src/ui';

/**
 * Barnets side (åpnes fra «Husstand»): saldo, siste avkrysninger med lønn og utbetalinger,
 * «Registrer utbetaling», og barnets egen enhet (koble til / koble fra).
 */
export default function EarningsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { data: members } = useMembers(householdId);
  const me = useMyMember(householdId);
  const balanceRow = useBalance(householdId, id);
  // Bare godkjent beløp kan betales ut. Det som venter, vises i saldoen og i utbetalingen.
  const payable = balanceRow?.balance_nok ?? 0;
  const pending = balanceRow?.pending_nok ?? 0;
  const { data: history, error, isPending } = useRewardHistory(householdId, id);
  const payout = useRecordPayout(householdId);
  const changeStatus = useSetCompletionStatus(householdId);
  const [paying, setPaying] = useState(false);

  const child = members?.find((m) => m.id === id && m.role === 'child');
  if (!child) return <ModalFormScreen closeTitle="Lukk">{null}</ModalFormScreen>;

  const isAdult = me?.role === 'adult';
  const color = personColor(child.avatar);

  // En voksen kan endre godkjenning i ettertid. Ventende avkrysninger behandles i «I dag».
  function confirmChange(event: Extract<RewardEvent, { kind: 'earned' }>) {
    const toApproved = event.status === 'rejected';
    const amount = formatKroner(event.amount);
    Alert.alert(
      toApproved ? 'Endre til godkjent?' : 'Endre til ikke godkjent?',
      toApproved
        ? `${amount} legges til saldoen igjen.`
        : `${amount} trekkes fra saldoen. Var det siste gang oppgaven ble gjort, regnes den som ikke gjort.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Endre',
          style: toApproved ? 'default' : 'destructive',
          onPress: () =>
            changeStatus.mutate({ id: event.id, status: toApproved ? 'approved' : 'rejected' }),
        },
      ],
    );
  }

  function onPressFor(event: RewardEvent) {
    if (!isAdult || event.kind !== 'earned' || event.status === 'pending') return undefined;
    if (changeStatus.isPending) return undefined;
    return () => confirmChange(event);
  }

  return (
    <ModalFormScreen closeTitle="Lukk">
      {/* Saldoen i barnets egen farge, som seksjonen i «I dag». */}
      <View style={[styles.header, { backgroundColor: color.tint }]}>
        <Avatar avatar={child.avatar} size={48} ring={color.ring} />
        <View style={styles.headerText}>
          <Text variant="personName" color={color.ink}>{child.display_name}</Text>
          <Text variant="jobAmount" color={color.ink}>{formatBalance(balanceRow)}</Text>
        </View>
      </View>

      {isAdult && payable > 0 && (
        <Button title="Registrer utbetaling" onPress={() => setPaying(true)} disabled={payout.isPending} />
      )}
      {payout.error && <Message>{toNorwegianMessage(payout.error)}</Message>}
      {error && <Message>{toNorwegianMessage(error)}</Message>}

      <Section title="Siste">
        {!isPending && history?.length === 0 && (
          <Message tone="muted">Ingen oppgaver med lønn ennå. Lønn setter du i oppgaveskjemaet.</Message>
        )}
        {changeStatus.error && <Message>{toNorwegianMessage(changeStatus.error)}</Message>}
        {history?.map((event) => (
          <RewardEventRow key={`${event.kind}-${event.id}`} event={event} onPress={onPressFor(event)} />
        ))}
      </Section>

      {isAdult && <DeviceSection child={child} householdId={householdId} />}

      {isAdult && (
        <View>
          <Button
            variant="secondary"
            title="Endre profil"
            onPress={() => router.push({ pathname: '/child/[id]', params: { id: child.id } })}
          />
        </View>
      )}

      <PayoutModal
        visible={paying}
        childName={child.display_name}
        balance={payable}
        pending={pending}
        saving={payout.isPending}
        onClose={() => setPaying(false)}
        onConfirm={(amountNok) =>
          payout.mutate({ memberId: child.id, amountNok }, { onSettled: () => setPaying(false) })
        }
      />
    </ModalFormScreen>
  );
}

/** «Har egen enhet» med «Koble fra», eller «Koble til enhet». Ett barn har én enhet. */
function DeviceSection({ child, householdId }: { child: Member; householdId: string }) {
  const unlink = useUnlinkDevice(householdId);
  const linked = !!child.auth_user_id;

  function confirmUnlink() {
    Alert.alert(
      `Koble fra ${child.display_name} sin enhet?`,
      'Enheten logges ut. Oppgaver og lønn beholdes, og du kan koble til igjen senere.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Koble fra', style: 'destructive', onPress: () => unlink.mutate(child.id) },
      ],
    );
  }

  return (
    <Section
      title="Egen enhet"
      description={
        linked
          ? `${child.display_name} har koblet til sin egen enhet.`
          : `${child.display_name} kan få appen på sin egen mobil eller nettbrett, uten e-post.`
      }
    >
      {linked ? (
        <Button variant="secondary" title="Koble fra" onPress={confirmUnlink} disabled={unlink.isPending} />
      ) : (
        <Button
          variant="secondary"
          title="Koble til enhet"
          onPress={() => router.push({ pathname: '/child/link/[id]', params: { id: child.id } })}
        />
      )}
      {unlink.error && <Message>{toNorwegianMessage(unlink.error)}</Message>}
    </Section>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.card, borderRadius: radius.section },
  headerText: { flex: 1 },
});
