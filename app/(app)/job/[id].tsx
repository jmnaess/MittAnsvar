import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { JobFields, useJobForm } from '../../../src/features/tasks/components/JobForm';
import { useArchiveTask, useTasks, useUpdateTask } from '../../../src/features/tasks/hooks';
import { markDeleted, markGone } from '../../../src/features/tasks/leftForm';
import type { Task } from '../../../src/features/tasks/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Button, Message, ModalFormScreen } from '../../../src/ui';

/** Endre en ekstrajobb fra «I dag» (langt trykk). Samme korte skjema som «Ny ekstrajobb». */
export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const { data: tasks, isPending } = useTasks(household!.id);
  // Slettingen ligger her, ikke i skjemaet: skjemaet forsvinner når listen er hentet på nytt.
  const archiveTask = useArchiveTask(household!.id);
  const deleting = archiveTask.isPending || archiveTask.isSuccess;

  const task = tasks?.find((t) => t.id === id);
  // Borte uten at vi slettet den selv (en annen voksen): lukk med en kort melding, hvis vi kan.
  const closeGone = !isPending && !deleting && !task && router.canGoBack();
  useEffect(() => {
    if (!closeGone) return;
    markGone('Ekstrajobben er slettet');
    router.back();
  }, [closeGone]);

  function remove(t: Task) {
    archiveTask.mutate(t.id, {
      onSuccess: () => {
        markDeleted(t);
        router.back();
      },
    });
  }

  if (isPending) return <ModalFormScreen>{null}</ModalFormScreen>;
  if (!task) {
    // På vei tilbake: vis ingenting i stedet for «Fant ikke».
    if (deleting || closeGone) return <ModalFormScreen>{null}</ModalFormScreen>;
    return (
      <ModalFormScreen>
        <Message tone="muted">Fant ikke ekstrajobben. Den kan være gjort eller slettet.</Message>
      </ModalFormScreen>
    );
  }
  // Skjemaet får startverdiene først når jobben er hentet.
  return (
    <EditJobForm
      task={task}
      householdId={household!.id}
      onDelete={() => remove(task)}
      deleting={archiveTask.isPending}
      deleteError={archiveTask.error}
    />
  );
}

type FormProps = {
  task: Task;
  householdId: string;
  /** Sletter oppgaven og går tilbake (ligger i skjermen over). */
  onDelete: () => void;
  deleting: boolean;
  deleteError: Error | null;
};

function EditJobForm({ task, householdId, onDelete, deleting, deleteError }: FormProps) {
  const { data: members } = useMembers(householdId);
  const updateTask = useUpdateTask(householdId);
  const form = useJobForm(task);

  const busy = updateTask.isPending || deleting;
  const error = updateTask.error ?? deleteError;

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
        onPress: onDelete,
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
