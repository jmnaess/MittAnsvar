import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { ModalFormScreen } from '../../../src/components/ModalFormScreen';
import { colors } from '../../../src/components/theme';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useArchiveTask, useTasks, useUpdateTask } from '../../../src/features/tasks/hooks';
import { isJob } from '../../../src/features/tasks/recurrence';
import type { Task } from '../../../src/features/tasks/types';
import { formatDate } from '../../../src/lib/dates';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const { data: tasks, isPending } = useTasks(household!.id);
  const [archived, setArchived] = useState(false);

  const task = tasks?.find((t) => t.id === id);

  // Etter sletting hentes listen på nytt før vi går tilbake. Da vises ingenting i stedet for «Fant ikke».
  if (isPending || archived) return <ModalFormScreen>{null}</ModalFormScreen>;
  if (!task) {
    return (
      <ModalFormScreen>
        <Text>Fant ikke oppgaven. Den kan være slettet.</Text>
      </ModalFormScreen>
    );
  }
  // Skjemaet får startverdiene først når oppgaven er hentet.
  return (
    <EditTaskForm task={task} householdId={household!.id} onArchived={() => setArchived(true)} />
  );
}

type FormProps = { task: Task; householdId: string; onArchived: () => void };

function EditTaskForm({ task, householdId, onArchived }: FormProps) {
  const { data: members } = useMembers(householdId);
  const updateTask = useUpdateTask(householdId);
  const archiveTask = useArchiveTask(householdId);
  const me = useMyMember(householdId);
  const form = useTaskForm(task);

  const busy = updateTask.isPending || archiveTask.isPending;
  const error = updateTask.error ?? archiveTask.error;

  function save() {
    if (!form.value) return;
    updateTask.mutate({ taskId: task.id, input: form.value }, { onSuccess: () => router.back() });
  }

  function confirmDelete() {
    Alert.alert(`Slette «${task.title}»?`, 'Oppgaven forsvinner fra listene.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: () =>
          archiveTask.mutate(task.id, {
            onSuccess: () => {
              onArchived();
              router.back();
            },
          }),
      },
    ]);
  }

  return (
    <ModalFormScreen canSave={!!form.value} saving={busy} onSave={save}>
      {error && <Text style={styles.error}>{toNorwegianMessage(error)}</Text>}
      <Text style={styles.due}>
        {isJob(task)
          ? 'Ledig jobb'
          : task.next_due_on
            ? `Neste gang: ${formatDate(task.next_due_on)}`
            : 'Ferdig'}
      </Text>
      <TaskFields
        form={form}
        members={members ?? []}
        canSetReward={me?.role === 'adult'}
        disabled={busy}
      />
      <Text style={styles.hint}>Endrer du hvor ofte, beregnes neste gang på nytt fra i dag.</Text>
      <View style={styles.delete}>
        <Button variant="danger" title="Slett oppgave" onPress={confirmDelete} disabled={busy} />
      </View>
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  due: { fontSize: 15, color: colors.muted },
  hint: { fontSize: 13, color: colors.muted },
  error: { color: colors.danger, fontSize: 15 },
  delete: { marginTop: 16 },
});
