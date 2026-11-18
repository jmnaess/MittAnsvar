import { router } from 'expo-router';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Button, makeStyles, Message, Section, pageWidth, spacing, Text, useTheme } from '../../../src/ui';
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
import { formatBalance } from '../../../src/features/rewards/format';
import type { Household, Member } from '../../../src/features/household/types';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function HouseholdScreen() {
  const styles = useStyles();
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { session } = useSession();
  const { data: members, error } = useMembers(household!.id);
  const { data: balances } = useBalances(household!.id);

  const me = members?.find((m) => m.auth_user_id === session?.user.id);
  const isAdult = me?.role === 'adult';
  const balanceOf = (memberId: string) => balances?.find((b) => b.member_id === memberId);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Section title="Medlemmer">
        {error && <Message>{toNorwegianMessage(error)}</Message>}
        {members?.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            extra={
              member.role === 'child'
                ? `Opptjent: ${formatBalance(balanceOf(member.id))}${member.auth_user_id ? ' · Egen enhet' : ''}`
                : undefined
            }
            accessibilityHint={
              member.role === 'child'
                ? 'Se opptjening, registrer utbetaling og koble til enhet'
                : 'Legg inn eller fjern profilbilde'
            }
            onPress={
              !isAdult
                ? undefined
                : member.role === 'child'
                  ? () => router.push({ pathname: '/earnings/[id]', params: { id: member.id } })
                  : () => router.push({ pathname: '/member/[id]', params: { id: member.id } })
            }
          />
        ))}
        {isAdult && (
          <Button variant="secondary" title="Legg til barn" onPress={() => router.push('/child/new')} />
        )}
      </Section>

      {isAdult && <InviteSection household={household!} members={members ?? []} />}
    </ScrollView>
  );
}

function InviteSection({ household, members }: { household: Household; members: Member[] }) {
  const styles = useStyles();
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
    <Section
      title="Inviter voksen"
      description="Den andre voksne får en kode som gjelder i 48 timer. De laster ned appen, logger inn og skriver inn koden."
    >
      <Button title="Inviter voksen" onPress={invite} disabled={createInvite.isPending} />
      {createInvite.error && <Message>{toNorwegianMessage(createInvite.error)}</Message>}

      {invites && invites.length > 0 && (
        <View style={styles.invites}>
          <Text variant="rowTitle">Aktive invitasjoner</Text>
          {invites.map((inv) => (
            <InviteRow
              key={inv.id}
              createdByName={nameOf(inv.created_by)}
              expiresAt={inv.expires_at}
              busy={revokeInvite.isPending}
              onRevoke={() => confirmRevoke(inv.id)}
            />
          ))}
          <Message tone="muted">
            Koden vises bare én gang. Har du mistet den, trekker du den tilbake og lager en ny.
          </Message>
        </View>
      )}
      {error && <Message>{toNorwegianMessage(error)}</Message>}
      {revokeInvite.error && <Message>{toNorwegianMessage(revokeInvite.error)}</Message>}
    </Section>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { ...pageWidth, padding: spacing.page, gap: spacing.section + 10, paddingBottom: 48 },
    invites: { gap: spacing.row, marginTop: 8 },
  }),
);
