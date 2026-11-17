import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/components/theme';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { TaskRow } from '../../../src/features/tasks/components/TaskRow';
import { useTasks } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';

/** Oversikt over alle aktive oppgaver, slik at de kan finnes og endres. */
export default function TasksScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: tasks, error, isPending, refetch, isRefetching } = useTasks(household!.id);
  const { data: members } = useMembers(household!.id);

  const nameOf = (memberId: string | null) =>
    members?.find((m) => m.id === memberId)?.display_name ?? 'Felles';

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={tasks ?? []}
      keyExtractor={(task) => task.id}
      onRefresh={refetch}
      refreshing={isRefetching}
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
          assigneeName={nameOf(item.assigned_member_id)}
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
