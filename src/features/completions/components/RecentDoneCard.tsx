import { StyleSheet, View } from 'react-native';
import { Card, Chip, colors, spacing, TaskRow, Text } from '../../../ui';
import { formatKroner } from '../../tasks/reward';
import type { RecentDay } from '../recent';

type Props = {
  days: RecentDay[];
  /** Fyllfarge på sjekkboksen: personens ring-farge. */
  checkColor: string;
};

/**
 * «Gjort siste 3 dager» i personvisningen: én gruppe per dag («I går», «Mandag»), gjennomstreket
 * og dempet som det som er gjort i dag. Bare visning. Vises ikke når ingenting er gjort.
 */
export function RecentDoneCard({ days, checkColor }: Props) {
  if (days.length === 0) return null;
  return (
    <Card>
      <Text variant="sectionTitle" accessibilityRole="header">Gjort siste 3 dager</Text>
      {days.map((day) => (
        <View key={day.key} style={styles.group}>
          <Text variant="label" color={colors.textMuted} accessibilityRole="header">
            {day.title}
          </Text>
          {day.items.map((c) => (
            <TaskRow
              key={c.id}
              title={c.title ?? ''}
              done
              muted
              checkColor={checkColor}
              accessibilityLabel={`${c.title}, utført ${day.title.toLowerCase()}`}
              right={
                c.reward_nok !== null ? (
                  <>
                    {c.status === 'pending' && <Chip label="Venter" />}
                    <Chip label={formatKroner(c.reward_nok)} tone="money" />
                  </>
                ) : undefined
              }
            />
          ))}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.row },
});
