import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { colors } from '../../../components/theme';
import { toNorwegianMessage } from '../../../lib/errors';
import type { Member } from '../../household/types';
import { formatKroner } from '../../tasks/reward';
import type { PendingCompletion } from '../api';
import { useApproveCompletions, usePendingCompletions, useRejectCompletion } from '../hooks';

type Props = { householdId: string; members: Member[] };

/**
 * «Til godkjenning» øverst i de voksnes «I dag» (steg 10b). Vises bare når noe venter.
 * Per rad: «Godkjenn» og «Ikke godkjent» (bekreftes, fordi oppgaven da regnes som ikke gjort).
 * «Godkjenn alle» når det er mer enn én.
 */
export function PendingApprovalSection({ householdId, members }: Props) {
  const { data: pending = [] } = usePendingCompletions(householdId);
  const approve = useApproveCompletions(householdId);
  const reject = useRejectCompletion(householdId);
  const busy = approve.isPending || reject.isPending;
  const error = approve.error ?? reject.error;

  if (pending.length === 0) return null;

  const memberOf = (id: string) => members.find((m) => m.id === id);

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
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Til godkjenning</Text>
        {pending.length > 1 && (
          <Pressable
            onPress={() => approve.mutate(pending.map((p) => p.id))}
            disabled={busy}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={[styles.link, busy && styles.disabled]}>Godkjenn alle</Text>
          </Pressable>
        )}
      </View>

      {pending.map((item) => {
        const member = memberOf(item.memberId);
        return (
          <View key={item.id} style={styles.row}>
            {member && <Avatar avatar={member.avatar} size={32} />}
            <View style={styles.text}>
              <Text style={styles.taskTitle}>{item.title}</Text>
              <Text style={styles.detail}>
                {member?.display_name ?? 'Barn'} · {formatKroner(item.amount)}
              </Text>
            </View>
            <SmallButton title="Ikke godkjent" onPress={() => confirmReject(item)} disabled={busy} />
            <SmallButton title="Godkjenn" primary onPress={() => approve.mutate([item.id])} disabled={busy} />
          </View>
        );
      })}

      {error && <Text style={styles.error}>{toNorwegianMessage(error)}</Text>}
    </View>
  );
}

type SmallButtonProps = { title: string; onPress: () => void; disabled?: boolean; primary?: boolean };

function SmallButton({ title, onPress, disabled, primary }: SmallButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.button, primary ? styles.primary : styles.outline, disabled && styles.disabled]}
    >
      <Text style={primary ? styles.primaryText : styles.outlineText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 4, marginBottom: 8, padding: 12, borderRadius: 12, backgroundColor: colors.selected },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  link: { fontSize: 15, fontWeight: '600', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  text: { flex: 1, gap: 2 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  detail: { fontSize: 14, color: colors.muted },
  button: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.background },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  outlineText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger, fontSize: 15 },
});
