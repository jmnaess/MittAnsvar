import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ApprovalBanner, Avatar, Button, colors, Message, radius, Sheet, spacing, Text } from '../../../ui';
import { toNorwegianMessage } from '../../../lib/errors';
import type { Member } from '../../household/types';
import { formatKroner } from '../../tasks/reward';
import type { PendingCompletion } from '../api';
import { useApproveCompletions, usePendingCompletions, useRejectCompletion } from '../hooks';

type Props = { householdId: string; members: Member[] };

/**
 * «Til godkjenning» i de voksnes «I dag» (steg 10b). Vises bare når noe venter.
 * Banneret viser hvem som venter og summen. «Se» åpner listen med «Godkjenn» og «Ikke godkjent»
 * per rad (bekreftes, fordi oppgaven da regnes som ikke gjort), og «Godkjenn alle» ved flere.
 */
export function PendingApprovalBanner({ householdId, members }: Props) {
  const { data: pending = [] } = usePendingCompletions(householdId);
  const [open, setOpen] = useState(false);

  // Lukk listen når alt er behandlet.
  useEffect(() => {
    if (pending.length === 0) setOpen(false);
  }, [pending.length]);

  if (pending.length === 0) return null;

  const memberOf = (id: string) => members.find((m) => m.id === id);
  const waitingIds = [...new Set(pending.map((p) => p.memberId))];
  const people = waitingIds.map((id) => {
    const m = memberOf(id);
    return { name: m?.display_name ?? 'Barn', avatar: m?.avatar ?? '' };
  });
  const total = pending.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <ApprovalBanner
        people={people}
        count={pending.length}
        total={formatKroner(total)}
        onOpen={() => setOpen(true)}
      />
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <PendingApprovalList householdId={householdId} pending={pending} memberOf={memberOf} />
        <Button title="Lukk" variant="text" onPress={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

type ListProps = {
  householdId: string;
  pending: PendingCompletion[];
  memberOf: (id: string) => Member | undefined;
};

function PendingApprovalList({ householdId, pending, memberOf }: ListProps) {
  const approve = useApproveCompletions(householdId);
  const reject = useRejectCompletion(householdId);
  const busy = approve.isPending || reject.isPending;
  const error = approve.error ?? reject.error;

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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.rows}>
        {pending.map((item) => {
          const member = memberOf(item.memberId);
          return (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowTop}>
                {member && <Avatar avatar={member.avatar} size={32} />}
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
      </ScrollView>

      {error && <Message>{toNorwegianMessage(error)}</Message>}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  scroll: { flexGrow: 0 },
  rows: { gap: spacing.row },
  row: { backgroundColor: colors.surfaceMuted, borderRadius: radius.row, padding: 12, gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
