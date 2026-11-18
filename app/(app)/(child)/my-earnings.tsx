import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, colors, Message, personColor, radius, Section, spacing, Text } from '../../../src/ui';
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

  const color = personColor(avatar);
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {/* Saldoen i barnets egen farge, som seksjonen i «I dag». */}
      <View style={[styles.header, { backgroundColor: color.tint }]}>
        <Avatar avatar={avatar} size={48} ring={color.ring} />
        <View style={styles.headerText}>
          <Text variant="personName" color={color.ink}>{name}</Text>
          <Text variant="jobAmount" color={color.ink}>{formatBalance(balance)}</Text>
        </View>
      </View>

      {error && <Message>{toNorwegianMessage(error)}</Message>}

      <Section title="Siste">
        {!isPending && history?.length === 0 && (
          <Message tone="muted">Du har ikke tjent noe ennå. Se etter ledige jobber under «I dag».</Message>
        )}
        {history?.map((event) => <RewardEventRow key={`${event.kind}-${event.id}`} event={event} />)}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.page, gap: spacing.section, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.card, borderRadius: radius.section },
  headerText: { flex: 1 },
});
