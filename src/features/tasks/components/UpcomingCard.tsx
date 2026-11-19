import { StyleSheet, View } from 'react-native';
import { Card, Chip, ListRow, Message, spacing, TaskRow, Text, useTheme } from '../../../ui';
import { formatDate, monthName } from '../../../lib/dates';
import { describeRecurrence } from '../recurrence';
import { formatKroner } from '../reward';
import type { Task } from '../types';
import { formatUpcomingDate, type MemberUpcoming } from '../upcoming';

type Props = {
  upcoming: MemberUpcoming;
  /** Personen er et barn: vis lønn. Voksne får aldri lønn. */
  showReward: boolean;
  /** Satt for voksne: trykk på raden åpner valgene. checkable som i upcoming.ts. Barn kan bare se. */
  onOpen?: (task: Task, checkable: boolean) => void;
  /**
   * Satt: rader som kan krysses av tidlig (checkable, se canCompleteEarly) får sirkel.
   * Med onOpen krysser sirkelen av og raden åpner valgene. Uten krysser hele raden av, som i «I dag».
   */
  onComplete?: (task: Task) => void;
  /** Oppgaven som krysses av nå: sirkelen vises fylt, og raden kan ikke trykkes. */
  busyId?: string;
  /** Fyllfarge på sirkelen: personens ring-farge. */
  checkColor?: string;
  /** Listen hentes fortsatt: ikke vis «Ingenting planlagt» ennå. */
  loading?: boolean;
  emptyText: string;
  /** Satt i «Alle»: hvem oppgaven er til («Kari» eller «Felles»), etter datoen på raden. */
  nameOf?: (task: Task) => string;
};

/**
 * «Kommende» i personvisningen og i «Alle»: hyppige oppgaver én gang («Hver dag · neste tor.
 * 19. nov.»), deretter én gruppe per uke med dato på hver rad, og til slutt «Neste måned» med
 * årshjulets månedsoppgaver. Den nærmeste forekomsten av en oppgave kan krysses av tidlig
 * (onComplete). Voksne åpner valgene med trykk på raden (onOpen). nameOf legger til hvem.
 */
export function UpcomingCard({
  upcoming, showReward, onOpen, onComplete, busyId, checkColor, loading, emptyText, nameOf,
}: Props) {
  const { colors } = useTheme();
  const { repeating, groups, nextMonth } = upcoming;
  const empty = repeating.length === 0 && groups.length === 0 && nextMonth.length === 0;
  const withName = (task: Task, meta: string) => (nameOf ? `${meta} · ${nameOf(task)}` : meta);

  const reward = (task: Task) =>
    showReward && task.reward_nok ? <Chip label={formatKroner(task.reward_nok)} tone="money" /> : undefined;

  // En vanlig funksjon, ikke en komponent: da monteres ikke radene på nytt ved hver render.
  function renderRow(key: string, task: Task, dateText: string, checkable: boolean) {
    const meta = withName(task, dateText);
    const open = onOpen ? () => onOpen(task, checkable) : undefined;
    if (!checkable || !onComplete) {
      return (
        <ListRow
          key={key}
          muted
          title={task.title}
          meta={meta}
          right={reward(task)}
          onPress={open}
          accessibilityLabel={open ? `${task.title}, ${meta}. Åpne valg` : undefined}
        />
      );
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
        onPress={open ?? complete}
        onCheckPress={open ? complete : undefined}
        checkAccessibilityLabel={open ? `Marker ${task.title} som utført nå` : undefined}
        accessibilityLabel={
          open ? `${task.title}, ${meta}. Åpne valg` : `${task.title}, ${meta}. Marker som utført nå`
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

      {nextMonth.length > 0 && (
        <View style={styles.group}>
          <Text variant="label" color={colors.textMuted} accessibilityRole="header">
            {`Neste måned (${monthName(nextMonth[0].dueOn)})`}
          </Text>
          {nextMonth.map((item) =>
            renderRow(item.key, item.task, `I løpet av ${monthName(item.dueOn)}`, item.checkable),
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  // Samme avstand mellom radene som i Card.
  group: { gap: spacing.row },
});
