import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/components/theme';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { TaskRow } from '../../../src/features/tasks/components/TaskRow';
import { useTasks } from '../../../src/features/tasks/hooks';
import { describeJobMembers } from '../../../src/features/tasks/job';
import { isJob } from '../../../src/features/tasks/recurrence';
import type { Task } from '../../../src/features/tasks/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';

/** Oversikt over alle aktive oppgaver, slik at de kan finnes og endres. */
export default function TasksScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: tasks, error, isPending, refetch } = useTasks(household!.id);
  const pullToRefresh = usePullToRefresh(refetch);
  const { data: members } = useMembers(household!.id);

  const nameOf = (task: Task) =>
    isJob(task)
      ? describeJobMembers(task.job_member_ids, members ?? [])
      : (members?.find((m) => m.id === task.assigned_member_id)?.display_name ?? 'Felles');

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={tasks ?? []}
      keyExtractor={(task) => task.id}
      {...pullToRefresh}
      ListHeaderComponent={
        <View style={styles.header}>
          <Button title="+ Ny oppgave" onPress={() => router.push('/task/new')} />
          {error && <Text style={styles.error}>{toNorwegianMessage(error)}</Text>}
        </View>
      }
      ListEmptyComponent={
        isPending ? undefined : (
          <Text style={styles.empty}>Ingen oppgaver ennå. Trykk «+ Ny oppgave» for å lage den første.</Text>
        )
      }
      renderItem={({ item }) => (
        <TaskRow
          task={item}
          assigneeName={nameOf(item)}
          onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  header: { gap: 12, marginBottom: 8 },
  error: { color: colors.danger, fontSize: 15 },
  empty: { color: colors.muted, fontSize: 15, marginTop: 16 },
});
