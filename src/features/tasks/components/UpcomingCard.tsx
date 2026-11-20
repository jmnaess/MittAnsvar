import { StyleSheet, View } from 'react-native';
import { Card, Chip, ListRow, Message, spacing, TaskRow, Text, useTheme } from '../../../ui';
import { formatDate, monthName } from '../../../lib/dates';
import { describeRecurrence } from '../recurrence';
import { formatKroner } from '../reward';
import type { Task } from '../types';
import { formatUpcomingDate, type MemberUpcoming, type UpcomingTask } from '../upcoming';

type Props<T extends UpcomingTask> = {
  upcoming: MemberUpcoming<T>;
  /**
   * Vis lønn: true når personen er et barn (voksne får aldri lønn). I «Alle» en funksjon som
   * sier om oppgaven er til et barn.
   */
  showReward: boolean | ((task: T) => boolean);
  /**
   * Satt for voksne: trykk på raden («Hvem gjorde …?» eller valgene). checkable som i upcoming.ts.
   * Barn kan bare se.
   */
  onRowPress?: (task: T, checkable: boolean) => void;
  /** Satt for voksne: langt trykk på raden åpner valgene. */
  onLongPress?: (task: T, checkable: boolean) => void;
  /**
   * Satt: rader som kan krysses av tidlig (checkable, se canCompleteEarly) får sirkel.
   * Med onRowPress krysser sirkelen av og raden gjør onRowPress. Uten krysser hele raden av, som i «I dag».
   */
  onComplete?: (task: T) => void;
  /** Oppgaven som krysses av nå: sirkelen vises fylt, og raden kan ikke trykkes. */
  busyId?: string;
  /** Fyllfarge på sirkelen: personens ring-farge. */
  checkColor?: string;
  /** Listen hentes fortsatt: ikke vis «Ingenting planlagt» ennå. */
  loading?: boolean;
  emptyText: string;
  /** «Slik gjør du» for raden: en trykkfunksjon, eller undefined = ikke ikon (useHowToSheet). */
  infoPressFor?: (task: T) => (() => void) | undefined;
  /**
   * Hvem oppgaven er til, etter datoen på raden. «Alle»: «Kari» eller «Felles». Personvisningen:
   * bare «Felles» (undefined = ingen navn).
   */
  nameOf?: (task: T) => string | undefined;
};

/**
 * «Kommende» i personvisningen og i «Alle»: hyppige oppgaver én gang («Hver dag · neste tor.
 * 19. nov.»), deretter én gruppe per uke med dato på hver rad, og til slutt «Neste måned» med
 * årshjulets månedsoppgaver. Den nærmeste forekomsten av en oppgave kan krysses av tidlig
 * (onComplete). Voksne: trykk på raden (onRowPress), langt trykk gir valgene (onLongPress). nameOf legger til hvem.
 */
export function UpcomingCard<T extends UpcomingTask = Task>({
  upcoming, showReward, onRowPress, onLongPress, onComplete, busyId, checkColor, loading, emptyText, nameOf, infoPressFor,
}: Props<T>) {
  const { colors } = useTheme();
  const { repeating, groups, nextMonth } = upcoming;
  const empty = repeating.length === 0 && groups.length === 0 && nextMonth.length === 0;
  const withName = (task: T, meta: string) => {
    const name = nameOf?.(task);
    return name ? `${meta} · ${name}` : meta;
  };

  const reward = (task: T) =>
    (typeof showReward === 'function' ? showReward(task) : showReward) && task.reward_nok ? <Chip label={formatKroner(task.reward_nok)} tone="money" /> : undefined;

  // En vanlig funksjon, ikke en komponent: da monteres ikke radene på nytt ved hver render.
  function renderRow(key: string, task: T, dateText: string, checkable: boolean) {
    const meta = withName(task, dateText);
    const open = onRowPress ? () => onRowPress(task, checkable) : undefined;
    const longPress = onLongPress ? () => onLongPress(task, checkable) : undefined;
    const hint = longPress ? 'Hold inne for valg' : undefined;
    const info = infoPressFor?.(task);
    if (!checkable || !onComplete) {
      return (
        <ListRow
          key={key}
          muted
          title={task.title}
          meta={meta}
          right={reward(task)}
          onPress={open}
          onLongPress={longPress}
          onInfoPress={info}
          accessibilityLabel={open ? `${task.title}, ${meta}. Åpne valg` : undefined}
          accessibilityHint={hint}
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
        onLongPress={longPress}
        onInfoPress={info}
        checkAccessibilityLabel={open ? `Marker ${task.title} som utført nå` : undefined}
        accessibilityLabel={open ? `${task.title}, ${meta}` : `${task.title}, ${meta}. Marker som utført nå`}
        accessibilityHint={open ? 'Trykk for å velge hvem som gjorde det. Hold inne for valg' : hint}
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
