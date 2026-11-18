import { StyleSheet, View } from 'react-native';
import { Card, Chip, colors, ListRow, Message, spacing, Text } from '../../../ui';
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
  /** Listen hentes fortsatt: ikke vis «Ingenting planlagt» ennå. */
  loading?: boolean;
  emptyText: string;
};

/**
 * «Kommende» i personvisningen: hyppige oppgaver én gang («Hver dag · neste tor. 19. nov.»),
 * deretter én gruppe per uke med dato på hver rad. Bare visning, unntatt at voksne kan åpne.
 */
export function UpcomingCard({ upcoming, showReward, onOpen, loading, emptyText }: Props) {
  const { repeating, groups } = upcoming;
  const empty = repeating.length === 0 && groups.length === 0;

  const reward = (task: Task) =>
    showReward && task.reward_nok ? <Chip label={formatKroner(task.reward_nok)} tone="money" /> : undefined;
  const open = (task: Task) => (onOpen ? () => onOpen(task) : undefined);

  return (
    <Card>
      <Text variant="sectionTitle" accessibilityRole="header">Kommende</Text>
      {empty && !loading && <Message tone="muted">{emptyText}</Message>}

      {repeating.map(({ task, nextOn }) => (
        <ListRow
          key={task.id}
          muted
          title={task.title}
          meta={`${describeRecurrence(task)} · neste ${formatDate(nextOn)}`}
          right={reward(task)}
          onPress={open(task)}
        />
      ))}

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text variant="label" color={colors.textMuted} accessibilityRole="header">
            {group.title}
          </Text>
          {group.items.map((item) => (
            <ListRow
              key={item.key}
              muted
              title={item.task.title}
              meta={formatUpcomingDate(item.dueOn)}
              right={reward(item.task)}
              onPress={open(item.task)}
            />
          ))}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  // Samme avstand mellom radene som i Card.
  group: { gap: spacing.row },
});
