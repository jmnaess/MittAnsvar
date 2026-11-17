import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { SwipeToDelete } from '../../../src/components/SwipeToDelete';
import { UndoToast } from '../../../src/components/UndoToast';
import { colors } from '../../../src/components/theme';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { TaskRow } from '../../../src/features/tasks/components/TaskRow';
import { useArchiveTask, useRestoreTask, useTasks } from '../../../src/features/tasks/hooks';
import { describeJobMembers } from '../../../src/features/tasks/job';
import { isJob } from '../../../src/features/tasks/recurrence';
import type { Task } from '../../../src/features/tasks/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';

/**
 * Oversikt over alle aktive oppgaver, slik at de kan finnes og endres.
 * Voksne kan dra en rad mot venstre og trykke «Slett». Oppgaven arkiveres med en gang, uten
 * bekreftelse, og banneret viser «Angre» i noen sekunder.
 */
export default function TasksScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: tasks, error, isPending, refetch } = useTasks(household!.id);
  const pullToRefresh = usePullToRefresh(refetch);
  const { data: members } = useMembers(household!.id);
  const isAdult = useMyMember(household!.id)?.role === 'adult';
  const archive = useArchiveTask(household!.id);
  const restore = useRestoreTask(household!.id);
  const [deleted, setDeleted] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function remove(task: Task) {
    setActionError(null);
    archive.mutate(task.id, {
      onSuccess: () => setDeleted(task),
      onError: (e) => setActionError(toNorwegianMessage(e)),
    });
  }

  function undoRemove() {
    if (!deleted) return;
    restore.mutate(deleted.id, {
      onSuccess: () => setDeleted(null),
      onError: (e) => {
        setDeleted(null);
        setActionError(toNorwegianMessage(e));
      },
    });
  }

  const nameOf = (task: Task) =>
    isJob(task)
      ? describeJobMembers(task.job_member_ids, members ?? [])
      : (members?.find((m) => m.id === task.assigned_member_id)?.display_name ?? 'Felles');

  return (
    <View style={styles.flex}>
      <FlatList
        contentContainerStyle={styles.container}
        data={tasks ?? []}
        keyExtractor={(task) => task.id}
        {...pullToRefresh}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button title="+ Ny oppgave" onPress={() => router.push('/task/new')} />
            {(error || actionError) && (
              <Text style={styles.error}>{actionError ?? toNorwegianMessage(error)}</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? undefined : (
            <Text style={styles.empty}>Ingen oppgaver ennå. Trykk «+ Ny oppgave» for å lage den første.</Text>
          )
        }
        renderItem={({ item }) => {
          const row = (
            <TaskRow
              task={item}
              assigneeName={nameOf(item)}
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
            />
          );
          return isAdult ? <SwipeToDelete onDelete={() => remove(item)}>{row}</SwipeToDelete> : row;
        }}
      />
      {deleted && (
        <UndoToast
          resetKey={deleted.id}
          message={`Slettet: ${deleted.title}`}
          undoing={restore.isPending}
          onUndo={undoRemove}
          onHide={() => setDeleted(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  // Ekstra plass nederst, så banneret ikke dekker den siste oppgaven.
  container: { padding: 24, paddingBottom: 120 },
  header: { gap: 12, marginBottom: 8 },
  error: { color: colors.danger, fontSize: 15 },
  empty: { color: colors.muted, fontSize: 15, marginTop: 16 },
});
