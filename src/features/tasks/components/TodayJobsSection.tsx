import { StyleSheet, View } from 'react-native';
import { JobGrid, Text, useTheme } from '../../../ui';
import type { TodayTask } from '../types';
import { TodayJobCard } from './TodayTaskRow';

type Props = {
  jobs: TodayTask[];
  /** Hvem jobben er for, per jobb. Utelatt = «Alle barna». */
  whoOf?: (job: TodayTask) => string;
  busyId?: string;
  onPress: (job: TodayTask) => void;
  /** For voksne: langt trykk endrer jobben. */
  onLongPress?: (job: TodayTask) => void;
  /** Tekst når det ikke er noen jobber. Utelatt = seksjonen vises ikke da. */
  emptyText?: string;
};

/** «Ledige jobber» nederst i «I dag»: overskrift og jobbkort i rutenett. */
export function TodayJobsSection({ jobs, whoOf, busyId, onPress, onLongPress, emptyText }: Props) {
  const { colors } = useTheme();
  if (jobs.length === 0 && !emptyText) return null;
  return (
    <View style={styles.section}>
      <Text variant="sectionTitle" accessibilityRole="header">Ledige jobber</Text>
      {jobs.length === 0 ? (
        <Text variant="meta" color={colors.textMuted}>{emptyText}</Text>
      ) : (
        <JobGrid>
          {jobs.map((job) => (
            <TodayJobCard
              key={job.id}
              task={job}
              assigneeName={whoOf?.(job)}
              busy={busyId === job.id}
              onPress={() => onPress(job)}
              onLongPress={onLongPress && (() => onLongPress(job))}
              longPressHint={onLongPress ? 'Hold inne for å endre jobben' : undefined}
            />
          ))}
        </JobGrid>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
});
