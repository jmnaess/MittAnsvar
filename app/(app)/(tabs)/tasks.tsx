import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, colors, EmptyState, Message, spacing, SwipeToDelete, UndoToast } from '../../../src/ui';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { NewTaskSheet } from '../../../src/features/tasks/components/NewTaskSheet';
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
  // «Ny oppgave»: velg «Oppgave» eller «Ledig jobb».
  const [creating, setCreating] = useState(false);

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
        ItemSeparatorComponent={Separator}
        {...pullToRefresh}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button title="Ny oppgave" onPress={() => setCreating(true)} />
            {(error || actionError) && <Message>{actionError ?? toNorwegianMessage(error)}</Message>}
          </View>
        }
        ListEmptyComponent={
          isPending ? undefined : (
            <EmptyState title="Ingen oppgaver ennå" text="Trykk «Ny oppgave» for å lage den første." />
          )
        }
        renderItem={({ item }) => {
          const row = (
            <TaskRow
              task={item}
              assigneeName={nameOf(item)}
              // Jobber endres i jobbskjemaet, alt annet i oppgaveskjemaet.
              onPress={() =>
                router.push({ pathname: isJob(item) ? '/job/[id]' : '/task/[id]', params: { id: item.id } })
              }
            />
          );
          return isAdult ? <SwipeToDelete onDelete={() => remove(item)}>{row}</SwipeToDelete> : row;
        }}
      />
      <NewTaskSheet
        visible={creating}
        onClose={() => setCreating(false)}
        taskLabel="Oppgave"
        taskHref="/task/new"
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

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  // Ekstra plass nederst, så banneret ikke dekker den siste oppgaven.
  container: { padding: spacing.page, paddingBottom: 120 },
  header: { gap: 12, marginBottom: spacing.section },
  separator: { height: spacing.row },
});
