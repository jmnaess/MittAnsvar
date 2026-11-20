import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { JobFields, useJobForm } from '../../../src/features/tasks/components/JobForm';
import { useArchiveTask, useTasks, useUpdateTask } from '../../../src/features/tasks/hooks';
import type { Task } from '../../../src/features/tasks/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Button, Message, ModalFormScreen } from '../../../src/ui';

/** Endre en ekstrajobb fra «I dag» (langt trykk). Samme korte skjema som «Ny ekstrajobb». */
export default function EditJobScreen() {
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
        <Message tone="muted">Fant ikke ekstrajobben. Den kan være gjort eller slettet.</Message>
      </ModalFormScreen>
    );
  }
  // Skjemaet får startverdiene først når jobben er hentet.
  return <EditJobForm task={task} householdId={household!.id} onArchived={() => setArchived(true)} />;
}

type FormProps = { task: Task; householdId: string; onArchived: () => void };

function EditJobForm({ task, householdId, onArchived }: FormProps) {
  const { data: members } = useMembers(householdId);
  const updateTask = useUpdateTask(householdId);
  const archiveTask = useArchiveTask(householdId);
  const form = useJobForm(task);

  const busy = updateTask.isPending || archiveTask.isPending;
  const error = updateTask.error ?? archiveTask.error;

  function save() {
    if (!form.value) return;
    updateTask.mutate({ taskId: task.id, input: form.value }, { onSuccess: () => router.back() });
  }

  function confirmDelete() {
    Alert.alert(`Slette «${task.title}»?`, 'Den forsvinner fra «Ekstrajobber».', [
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
      {error && <Message>{toNorwegianMessage(error)}</Message>}
      <JobFields form={form} members={members ?? []} disabled={busy} />
      <View style={styles.delete}>
        <Button variant="danger" title="Slett ekstrajobb" onPress={confirmDelete} disabled={busy} />
      </View>
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  delete: { marginTop: 16 },
});
