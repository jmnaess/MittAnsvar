import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../src/components/Avatar';
import { Button } from '../../../src/components/Button';
import { ModalFormScreen } from '../../../src/components/ModalFormScreen';
import { colors } from '../../../src/components/theme';
import { useUnlinkDevice } from '../../../src/features/devices/hooks';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import type { Member } from '../../../src/features/household/types';
import { PayoutModal } from '../../../src/features/rewards/components/PayoutModal';
import { RewardEventRow } from '../../../src/features/rewards/components/RewardEventRow';
import { useBalance, useRecordPayout, useRewardHistory } from '../../../src/features/rewards/hooks';
import { formatKroner } from '../../../src/features/tasks/reward';
import { toNorwegianMessage } from '../../../src/lib/errors';

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

      {isAdult && <DeviceSection child={child} householdId={householdId} />}

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
    <View style={styles.device}>
      <Text style={styles.sectionTitle}>Egen enhet</Text>
      <Text style={styles.muted}>
        {linked
          ? `📱 ${child.display_name} har koblet til sin egen enhet.`
          : `${child.display_name} kan få appen på sin egen mobil eller nettbrett, uten e-post.`}
      </Text>
      {linked ? (
        <Button variant="outline" title="Koble fra" onPress={confirmUnlink} disabled={unlink.isPending} />
      ) : (
        <Button
          variant="outline"
          title="Koble til enhet"
          onPress={() => router.push({ pathname: '/child/link/[id]', params: { id: child.id } })}
        />
      )}
      {unlink.error && <Text style={styles.error}>{toNorwegianMessage(unlink.error)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  device: { gap: 8, marginTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { gap: 2 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  balance: { fontSize: 17, color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  muted: { fontSize: 14, color: colors.muted },
  error: { color: colors.danger, fontSize: 15 },
  edit: { marginTop: 16 },
});
