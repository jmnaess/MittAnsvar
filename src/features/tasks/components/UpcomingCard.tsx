import { StyleSheet, View } from 'react-native';
import { Card, Chip, ListRow, Message, spacing, TaskRow, Text, useTheme } from '../../../ui';
import { formatDate } from '../../../lib/dates';
import { describeRecurrence } from '../recurrence';
import { formatKroner } from '../reward';
import type { Task } from '../types';
import { formatUpcomingDate, type MemberUpcoming } from '../upcoming';

type Props = {
  upcoming: MemberUpcoming;
  /** Personen er et barn: vis lønn. Voksne får aldri lønn. */
  showReward: boolean;
  /** Satt for voksne: trykk åpner oppgaven i redigering. Barn kan bare se. */
  onOpen?: (task: Task) => void;
  /**
   * Satt: rader som kan krysses av tidlig (checkable, se canCompleteEarly) får sirkel.
   * Med onOpen krysser sirkelen av og raden åpner. Uten krysser hele raden av, som i «I dag».
   */
  onComplete?: (task: Task) => void;
  /** Oppgaven som krysses av nå: sirkelen vises fylt, og raden kan ikke trykkes. */
  busyId?: string;
  /** Fyllfarge på sirkelen: personens ring-farge. */
  checkColor?: string;
  /** Listen hentes fortsatt: ikke vis «Ingenting planlagt» ennå. */
  loading?: boolean;
  emptyText: string;
};

/**
 * «Kommende» i personvisningen: hyppige oppgaver én gang («Hver dag · neste tor. 19. nov.»),
 * deretter én gruppe per uke med dato på hver rad. Den nærmeste forekomsten av en oppgave kan
 * krysses av tidlig (onComplete). Ellers bare visning, unntatt at voksne kan åpne.
 */
export function UpcomingCard({
  upcoming, showReward, onOpen, onComplete, busyId, checkColor, loading, emptyText,
}: Props) {
  const { colors } = useTheme();
  const { repeating, groups } = upcoming;
  const empty = repeating.length === 0 && groups.length === 0;

  const reward = (task: Task) =>
    showReward && task.reward_nok ? <Chip label={formatKroner(task.reward_nok)} tone="money" /> : undefined;
  const open = (task: Task) => (onOpen ? () => onOpen(task) : undefined);

  // En vanlig funksjon, ikke en komponent: da monteres ikke radene på nytt ved hver render.
  function renderRow(key: string, task: Task, meta: string, checkable: boolean) {
    if (!checkable || !onComplete) {
      return <ListRow key={key} muted title={task.title} meta={meta} right={reward(task)} onPress={open(task)} />;
    }
    const busy = busyId === task.id;
    const complete = () => onComplete(task);
    return (
      <TaskRow
        key={key}
        muted
        title={task.title}
        meta={meta}
        right={reward(task)}
        done={busy}
        disabled={busy}
        checkColor={checkColor}
        onPress={onOpen ? () => onOpen(task) : complete}
        onCheckPress={onOpen ? complete : undefined}
        checkAccessibilityLabel={onOpen ? `Marker ${task.title} som utført nå` : undefined}
        accessibilityLabel={
          onOpen ? `${task.title}, ${meta}. Åpne oppgaven` : `${task.title}, ${meta}. Marker som utført nå`
        }
      />
    );
  }

  return (
    <Card>
      <Text variant="sectionTitle" accessibilityRole="header">Kommende</Text>
      {empty && !loading && <Message tone="muted">{emptyText}</Message>}

      {repeating.map(({ task, nextOn, checkable }) =>
        renderRow(task.id, task, `${describeRecurrence(task)} · neste ${formatDate(nextOn)}`, checkable),
      )}

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text variant="label" color={colors.textMuted} accessibilityRole="header">
            {group.title}
          </Text>
          {group.items.map((item) =>
            renderRow(item.key, item.task, formatUpcomingDate(item.dueOn), item.checkable),
          )}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  // Samme avstand mellom radene som i Card.
  group: { gap: spacing.row },
});
