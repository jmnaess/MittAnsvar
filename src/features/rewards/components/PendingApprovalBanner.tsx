import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  ApprovalBanner,
  Button,
  makeStyles,
  Message,
  radius,
  Sheet,
  spacing,
  Text,
  useTheme,
} from '../../../ui';
import { toNorwegianMessage } from '../../../lib/errors';
import { MemberAvatar } from '../../household/components/MemberAvatar';
import { useMemberPhotoLookup } from '../../household/hooks';
import type { Member } from '../../household/types';
import type { PendingProposal } from '../../proposals/api';
import { ProposalReviewRow } from '../../proposals/components/ProposalReviewRow';
import { approvalBannerText } from '../../proposals/format';
import { useDecideProposal, usePendingProposals } from '../../proposals/hooks';
import { formatKroner } from '../../tasks/reward';
import type { PendingCompletion } from '../api';
import { useApproveCompletions, usePendingCompletions, useRejectCompletion } from '../hooks';

type Props = { householdId: string; members: Member[] };

/**
 * Banneret øverst i de voksnes «I dag» når barna venter: forslag fra barna og avkrysninger med
 * lønn («Til godkjenning», steg 10b). Vises bare når noe venter.
 * «Se» åpner arket: først forslagene (Godkjenn med beløp, eller Avslå), så avkrysningene med
 * «Godkjenn» og «Ikke godkjent» per rad (bekreftes, fordi oppgaven da regnes som ikke gjort), og
 * «Godkjenn alle» ved flere.
 */
export function PendingApprovalBanner({ householdId, members }: Props) {
  const { data: pending = [] } = usePendingCompletions(householdId);
  const { data: proposals = [] } = usePendingProposals(householdId);
  const photoOf = useMemberPhotoLookup(householdId);
  const [open, setOpen] = useState(false);
  const waitingCount = pending.length + proposals.length;

  // Lukk arket når alt er behandlet.
  useEffect(() => {
    if (waitingCount === 0) setOpen(false);
  }, [waitingCount]);

  if (waitingCount === 0) return null;

  const memberOf = (id: string) => members.find((m) => m.id === id);
  const nameOf = (id: string) => memberOf(id)?.display_name ?? 'Barn';
  // Forslagene først, så de som har krysset av.
  const waitingIds = [...new Set([...proposals.map((p) => p.memberId), ...pending.map((p) => p.memberId)])];
  const people = waitingIds.map((id) => {
    const m = memberOf(id);
    return { name: nameOf(id), avatar: m?.avatar ?? '', photo: photoOf(m) };
  });
  const text = approvalBannerText({
    names: people.map((p) => p.name),
    proposalNames: [...new Set(proposals.map((p) => p.memberId))].map(nameOf),
    completionCount: pending.length,
    completionTotal: pending.reduce((sum, p) => sum + p.amount, 0),
    proposalCount: proposals.length,
  });

  return (
    <>
      <ApprovalBanner people={people} title={text.title} meta={text.meta} onOpen={() => setOpen(true)} />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        footer={<Button title="Lukk" variant="text" onPress={() => setOpen(false)} />}
      >
        <ProposalList householdId={householdId} proposals={proposals} memberOf={memberOf} />
        <PendingApprovalList householdId={householdId} pending={pending} memberOf={memberOf} />
      </Sheet>
    </>
  );
}

type ProposalListProps = {
  householdId: string;
  proposals: PendingProposal[];
  memberOf: (id: string) => Member | undefined;
};

/** «Forslag»: ett kort per forslag, med lønnsfelt, «Avslå» og «Godkjenn». */
function ProposalList({ householdId, proposals, memberOf }: ProposalListProps) {
  const styles = useStyles();
  const decide = useDecideProposal(householdId);
  if (proposals.length === 0) return null;

  return (
    <View style={styles.list}>
      <Text variant="sectionTitle" accessibilityRole="header">Forslag</Text>
      <View style={styles.rows}>
        {proposals.map((p) => (
          <ProposalReviewRow
            key={p.id}
            proposal={p}
            member={memberOf(p.memberId)}
            busy={decide.isPending}
            onDecide={(approve, amountNok) => decide.mutate({ id: p.id, approve, amountNok })}
          />
        ))}
      </View>
      {decide.error && <Message>{toNorwegianMessage(decide.error)}</Message>}
    </View>
  );
}

type ListProps = {
  householdId: string;
  pending: PendingCompletion[];
  memberOf: (id: string) => Member | undefined;
};

function PendingApprovalList({ householdId, pending, memberOf }: ListProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const approve = useApproveCompletions(householdId);
  const reject = useRejectCompletion(householdId);
  const busy = approve.isPending || reject.isPending;
  const error = approve.error ?? reject.error;

  if (pending.length === 0) return null;

  function confirmReject(item: PendingCompletion) {
    const name = memberOf(item.memberId)?.display_name ?? 'Barnet';
    Alert.alert(
      `Ikke godkjenne «${item.title}»?`,
      `${name} får ikke ${formatKroner(item.amount)}, og oppgaven regnes som ikke gjort. ` +
        'Den kommer tilbake i listen.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ikke godkjent', style: 'destructive', onPress: () => reject.mutate(item.id) },
      ],
    );
  }

  return (
    <View style={styles.list}>
      <View style={styles.header}>
        <Text variant="sectionTitle" style={styles.flex} accessibilityRole="header">
          Til godkjenning
        </Text>
        {pending.length > 1 && (
          <Button
            title="Godkjenn alle"
            small
            onPress={() => approve.mutate(pending.map((p) => p.id))}
            disabled={busy}
          />
        )}
      </View>

      <View style={styles.rows}>
        {pending.map((item) => {
          const member = memberOf(item.memberId);
          return (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowTop}>
                {member && <MemberAvatar member={member} size={32} />}
                <View style={styles.flex}>
                  <Text variant="rowTitle">{item.title}</Text>
                  <Text variant="meta" color={colors.textMuted}>
                    {member?.display_name ?? 'Barn'} · {formatKroner(item.amount)}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Button
                  title="Ikke godkjent"
                  variant="secondary"
                  small
                  onPress={() => confirmReject(item)}
                  disabled={busy}
                />
                <Button title="Godkjenn" small onPress={() => approve.mutate([item.id])} disabled={busy} />
              </View>
            </View>
          );
        })}
      </View>

      {error && <Message>{toNorwegianMessage(error)}</Message>}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    list: { gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    flex: { flex: 1 },
    rows: { gap: spacing.row },
    row: { backgroundColor: colors.surfaceMuted, borderRadius: radius.row, padding: 12, gap: 10 },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  }),
);
