import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useUnlinkDevice } from '../../../src/features/devices/hooks';
import { MemberAvatar } from '../../../src/features/household/components/MemberAvatar';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import type { Member } from '../../../src/features/household/types';
import { ExtraRewardSheet } from '../../../src/features/rewards/components/ExtraRewardSheet';
import { PayoutModal } from '../../../src/features/rewards/components/PayoutModal';
import { RewardEditSheet } from '../../../src/features/rewards/components/RewardEditSheet';
import { RewardEventRow } from '../../../src/features/rewards/components/RewardEventRow';
import type { RewardEvent } from '../../../src/features/rewards/api';
import {
  useAddExtraReward,
  useBalance,
  useDeleteExtraReward,
  useRecordPayout,
  useRewardHistory,
  useSetCompletionReward,
  useSetCompletionStatus,
} from '../../../src/features/rewards/hooks';
import {
  advanceNote,
  advanceWarningFor,
  extraRewardTitle,
  formatBalance,
  isAdvance,
} from '../../../src/features/rewards/format';
import { formatKroner } from '../../../src/features/tasks/reward';
import { toNorwegianMessage } from '../../../src/lib/errors';
import {
  Button,
  Message,
  ModalFormScreen,
  radius,
  Section,
  spacing,
  Text,
  useTheme,
} from '../../../src/ui';

type EarnedEvent = Extract<RewardEvent, { kind: 'earned' }>;
type ExtraEvent = Extract<RewardEvent, { kind: 'extra' }>;

/**
 * Barnets side (åpnes fra «Husstand»): saldo (eller forskudd), siste avkrysninger med lønn,
 * ekstra lønn og utbetalinger, «Legg til ekstra lønn», «Registrer utbetaling», og barnets egen
 * enhet (koble til / koble fra). Voksne kan endre lønnen på en godkjent avkrysning og fjerne
 * ekstra lønn. Alt som gir forskudd, bekreftes først.
 */
export default function EarningsScreen() {
  const { personColor } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { data: members } = useMembers(householdId);
  const me = useMyMember(householdId);
  const balanceRow = useBalance(householdId, id);
  // Godkjent + ekstra − utbetalt. Under 0 = forskudd. Det som venter, kan ikke betales ut.
  const payable = balanceRow?.balance_nok ?? 0;
  const pending = balanceRow?.pending_nok ?? 0;
  const { data: history, error, isPending } = useRewardHistory(householdId, id);
  const payout = useRecordPayout(householdId);
  const changeStatus = useSetCompletionStatus(householdId);
  const changeReward = useSetCompletionReward(householdId);
  const addExtra = useAddExtraReward(householdId);
  const deleteExtra = useDeleteExtraReward(householdId);
  const [paying, setPaying] = useState(false);
  const [addingExtra, setAddingExtra] = useState(false);
  const [editing, setEditing] = useState<EarnedEvent | null>(null);

  const child = members?.find((m) => m.id === id && m.role === 'child');
  if (!child) return <ModalFormScreen closeTitle="Lukk">{null}</ModalFormScreen>;

  const isAdult = me?.role === 'adult';
  const color = personColor(child.avatar);

  const name = child.display_name;
  const busy = changeStatus.isPending || changeReward.isPending || deleteExtra.isPending;

  // Gir det forskudd å trekke `reduction` kr? Da spør vi først. Ellers skjer det med en gang.
  function withAdvanceCheck(reduction: number, run: () => void) {
    const warning = advanceWarningFor(balanceRow, name, reduction);
    if (!warning) return run();
    Alert.alert('Gi forskudd?', warning, [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Fortsett', onPress: run },
    ]);
  }

  // Avvist → godkjent igjen. Godkjent åpner «Endre lønn» (med «Ikke godkjent» der).
  function confirmApprove(event: EarnedEvent) {
    Alert.alert('Endre til godkjent?', `${formatKroner(event.amount)} legges til saldoen igjen.`, [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Endre', onPress: () => changeStatus.mutate({ id: event.id, status: 'approved' }) },
    ]);
  }

  // Alert-ene vises mens arket fortsatt er åpent (en Alert mens arket lukkes kan forsvinne på iOS).
  function saveReward(event: EarnedEvent, amountNok: number) {
    withAdvanceCheck(event.amount - amountNok, () => {
      setEditing(null);
      changeReward.mutate({ id: event.id, amountNok });
    });
  }

  function rejectFromSheet(event: EarnedEvent) {
    const reject = () => {
      setEditing(null);
      changeStatus.mutate({ id: event.id, status: 'rejected' });
    };
    const warning = advanceWarningFor(balanceRow, name, event.amount);
    Alert.alert(
      'Endre til ikke godkjent?',
      warning ??
        `${formatKroner(event.amount)} trekkes fra saldoen. Var det siste gang oppgaven ble gjort, regnes den som ikke gjort.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: warning ? 'Fortsett' : 'Endre', style: 'destructive', onPress: reject },
      ],
    );
  }

  function confirmDeleteExtra(event: ExtraEvent) {
    const warning = advanceWarningFor(balanceRow, name, event.amount);
    Alert.alert(
      'Fjerne ekstra lønn?',
      [`${formatKroner(event.amount)} · ${extraRewardTitle(event.reason)}`, warning].filter(Boolean).join('\n\n'),
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Fjern', style: 'destructive', onPress: () => deleteExtra.mutate(event.id) },
      ],
    );
  }

  function onPressFor(event: RewardEvent) {
    if (!isAdult || busy) return undefined;
    if (event.kind === 'extra') return () => confirmDeleteExtra(event);
    if (event.kind !== 'earned' || event.status === 'pending') return undefined;
    if (event.status === 'rejected') return () => confirmApprove(event);
    return () => setEditing(event);
  }

  const actionError = changeStatus.error ?? changeReward.error ?? deleteExtra.error;

  return (
    <ModalFormScreen closeTitle="Lukk">
      {/* Saldoen i barnets egen farge, som seksjonen i «I dag». */}
      <View style={[styles.header, { backgroundColor: color.tint }]}>
        <MemberAvatar member={child} size={48} ring={color.ring} />
        <View style={styles.headerText}>
          <Text variant="personName" color={color.ink}>{child.display_name}</Text>
          <Text variant="jobAmount" color={color.ink}>{formatBalance(balanceRow)}</Text>
          {isAdvance(balanceRow) && (
            <Text variant="meta" color={color.ink}>{advanceNote(name, false)}</Text>
          )}
        </View>
      </View>

      {/* Øverst, så det er lett å finne hvor barnets navn endres (raden i Husstand sier det). */}
      {isAdult && (
        <Button
          variant="secondary"
          title="Endre navn og profil"
          onPress={() => router.push({ pathname: '/child/[id]', params: { id: child.id } })}
        />
      )}
      {isAdult && (
        <>
          <Button
            variant="secondary"
            title="Legg til ekstra lønn"
            onPress={() => setAddingExtra(true)}
            disabled={addExtra.isPending}
          />
          <Button title="Registrer utbetaling" onPress={() => setPaying(true)} disabled={payout.isPending} />
        </>
      )}
      {payout.error && <Message>{toNorwegianMessage(payout.error)}</Message>}
      {addExtra.error && <Message>{toNorwegianMessage(addExtra.error)}</Message>}
      {error && <Message>{toNorwegianMessage(error)}</Message>}

      <Section title="Siste">
        {!isPending && history?.length === 0 && (
          <Message tone="muted">Ingenting tjent ennå. Legg ut en ekstrajobb under «I dag», eller sett lønn på en oppgave.</Message>
        )}
        {actionError && <Message>{toNorwegianMessage(actionError)}</Message>}
        {history?.map((event) => (
          <RewardEventRow key={`${event.kind}-${event.id}`} event={event} onPress={onPressFor(event)} />
        ))}
      </Section>

      {isAdult && <DeviceSection child={child} householdId={householdId} />}

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

      <ExtraRewardSheet
        visible={addingExtra}
        childName={child.display_name}
        saving={addExtra.isPending}
        onClose={() => setAddingExtra(false)}
        onConfirm={(amountNok, reason) =>
          addExtra.mutate(
            { memberId: child.id, amountNok, reason },
            { onSettled: () => setAddingExtra(false) },
          )
        }
      />

      <RewardEditSheet
        event={editing}
        saving={changeReward.isPending || changeStatus.isPending}
        onClose={() => setEditing(null)}
        onSave={(amountNok) => editing && saveReward(editing, amountNok)}
        onReject={() => editing && rejectFromSheet(editing)}
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
