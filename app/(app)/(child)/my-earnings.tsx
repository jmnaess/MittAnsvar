import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../src/components/Avatar';
import { colors } from '../../../src/components/theme';
import { useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { RewardEventRow } from '../../../src/features/rewards/components/RewardEventRow';
import { useBalances, useRewardHistory } from '../../../src/features/rewards/hooks';
import { formatBalance } from '../../../src/features/rewards/format';
import { toNorwegianMessage } from '../../../src/lib/errors';

/** «Min lønn» på barnets enhet: egen saldo og historikk. RLS gjør at barnet bare ser sitt eget. */
export default function MyEarningsScreen() {
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const me = useMyMember(householdId);
  if (!me) return null;
  return <Earnings householdId={householdId} memberId={me.id} name={me.display_name} avatar={me.avatar} />;
}

type Props = { householdId: string; memberId: string; name: string; avatar: string };

function Earnings({ householdId, memberId, name, avatar }: Props) {
  const balances = useBalances(householdId);
  const balance = balances.data?.find((b) => b.member_id === memberId);
  const { data: history, error, isPending, refetch } = useRewardHistory(householdId, memberId);

  // En voksen kan ha registrert en utbetaling siden sist. refetch er stabil, så dette kjører
  // bare når fanen får fokus.
  const refetchBalances = balances.refetch;
  useFocusEffect(useCallback(() => { refetchBalances(); refetch(); }, [refetchBalances, refetch]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar avatar={avatar} size={48} />
        <View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.balance}>Saldo: {formatBalance(balance)}</Text>
        </View>
      </View>

      {error && <Text style={styles.error}>{toNorwegianMessage(error)}</Text>}

      <Text style={styles.sectionTitle}>Siste</Text>
      {!isPending && history?.length === 0 && (
        <Text style={styles.muted}>Du har ikke tjent noe ennå. Se etter ledige jobber under «I dag».</Text>
      )}
      {history?.map((event) => <RewardEventRow key={`${event.kind}-${event.id}`} event={event} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, backgroundColor: colors.background, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  balance: { fontSize: 17, color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  muted: { fontSize: 14, color: colors.muted },
  error: { color: colors.danger, fontSize: 15 },
});
