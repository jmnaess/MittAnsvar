import { router } from 'expo-router';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/components/theme';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { InviteRow } from '../../../src/features/household/components/InviteRow';
import { MemberRow } from '../../../src/features/household/components/MemberRow';
import {
  useActiveInvites,
  useCreateInvite,
  useMembers,
  useMyHousehold,
  useRevokeInvite,
} from '../../../src/features/household/hooks';
import { inviteShareMessage } from '../../../src/features/household/inviteCode';
import { useBalances } from '../../../src/features/rewards/hooks';
import { formatKroner } from '../../../src/features/tasks/reward';
import type { Household, Member } from '../../../src/features/household/types';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function HouseholdScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { session } = useSession();
  const { data: members, error } = useMembers(household!.id);
  const { data: balances } = useBalances(household!.id);

  const me = members?.find((m) => m.auth_user_id === session?.user.id);
  const isAdult = me?.role === 'adult';
  const balanceOf = (memberId: string) =>
    balances?.find((b) => b.member_id === memberId)?.balance_nok ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Medlemmer">
        {error && <Text style={styles.error}>{toNorwegianMessage(error)}</Text>}
        {members?.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            extra={
              member.role === 'child'
                ? `Opptjent: ${formatKroner(balanceOf(member.id))}${member.auth_user_id ? ' · 📱 Egen enhet' : ''}`
                : undefined
            }
            accessibilityHint="Se opptjening, registrer utbetaling og koble til enhet"
            onPress={
              isAdult && member.role === 'child'
                ? () => router.push({ pathname: '/earnings/[id]', params: { id: member.id } })
                : undefined
            }
          />
        ))}
        {isAdult && (
          <Button variant="outline" title="Legg til barn" onPress={() => router.push('/child/new')} />
        )}
      </Section>

      {isAdult && <InviteSection household={household!} members={members ?? []} />}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InviteSection({ household, members }: { household: Household; members: Member[] }) {
  const { data: invites, error } = useActiveInvites(household.id);
  const createInvite = useCreateInvite(household.id);
  const revokeInvite = useRevokeInvite(household.id);

  // Lager koden og åpner delingsmenyen. Avbryter brukeren delingen, er koden likevel laget
  // og vises under «Aktive invitasjoner», der den kan trekkes tilbake.
  function invite() {
    createInvite.mutate(undefined, {
      onSuccess: ({ code }) => {
        Share.share({ message: inviteShareMessage(household.name, code) }).catch(() => {
          Alert.alert('Kunne ikke åpne delingsmenyen', 'Trekk tilbake invitasjonen og prøv igjen.');
        });
      },
    });
  }

  function confirmRevoke(inviteId: string) {
    Alert.alert('Trekke tilbake invitasjonen?', 'Koden slutter å virke med en gang.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Trekk tilbake',
        style: 'destructive',
        onPress: () => revokeInvite.mutate(inviteId),
      },
    ]);
  }

  const nameOf = (memberId: string) => members.find((m) => m.id === memberId)?.display_name;

  return (
    <Section title="Inviter voksen">
      <Text style={styles.muted}>
        Den andre voksne får en kode som gjelder i 48 timer. De laster ned appen, logger inn og
        skriver inn koden.
      </Text>
      <Button title="Inviter voksen" onPress={invite} disabled={createInvite.isPending} />
      {createInvite.error && (
        <Text style={styles.error}>{toNorwegianMessage(createInvite.error)}</Text>
      )}

      {invites && invites.length > 0 && (
        <View style={styles.invites}>
          <Text style={styles.subTitle}>Aktive invitasjoner</Text>
          {invites.map((inv) => (
            <InviteRow
              key={inv.id}
              createdByName={nameOf(inv.created_by)}
              expiresAt={inv.expires_at}
              busy={revokeInvite.isPending}
              onRevoke={() => confirmRevoke(inv.id)}
            />
          ))}
          <Text style={styles.muted}>
            Koden vises bare én gang. Har du mistet den, trekker du den tilbake og lager en ny.
          </Text>
        </View>
      )}
      {error && <Text style={styles.error}>{toNorwegianMessage(error)}</Text>}
      {revokeInvite.error && (
        <Text style={styles.error}>{toNorwegianMessage(revokeInvite.error)}</Text>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 28 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  subTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  invites: { gap: 6, marginTop: 8 },
  muted: { fontSize: 14, color: colors.muted },
  error: { color: colors.danger, fontSize: 15 },
});
