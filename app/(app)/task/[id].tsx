import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { HowToContent, useTaskHowTo } from '../../../src/features/tasks/components/HowToSheet';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useArchiveTask, useTasks, useUpdateTask } from '../../../src/features/tasks/hooks';
import { markDeleted, markGone } from '../../../src/features/tasks/leftForm';
import { isJob } from '../../../src/features/tasks/recurrence';
import { isFromTasks, revealSaved } from '../../../src/features/tasks/tasksSegment';
import type { Task } from '../../../src/features/tasks/types';
import { formatDate } from '../../../src/lib/dates';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Button, Card, Message, ModalFormScreen, Text, useTheme } from '../../../src/ui';

export default function EditTaskScreen() {
  const params = useLocalSearchParams<{ id: string; from?: string }>();
  const { id } = params;
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
    markGone('Oppgaven er slettet');
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
        <Message tone="muted">Fant ikke oppgaven. Den kan være slettet.</Message>
      </ModalFormScreen>
    );
  }
  // Skjemaet får startverdiene først når oppgaven er hentet.
  return (
    <EditTaskForm
      task={task}
      householdId={household!.id}
      fromTasks={isFromTasks(params)}
      onDelete={() => remove(task)}
      deleting={archiveTask.isPending}
      deleteError={archiveTask.error}
    />
  );
}

type FormProps = {
  task: Task;
  householdId: string;
  /** Åpnet fra «Oppgaver»: etter lagring vises oppgaven i segmentet der den havnet. */
  fromTasks: boolean;
  /** Sletter oppgaven og går tilbake (ligger i skjermen over). */
  onDelete: () => void;
  deleting: boolean;
  deleteError: Error | null;
};

function EditTaskForm({ task, householdId, fromTasks, onDelete, deleting, deleteError }: FormProps) {
  const { colors } = useTheme();
  const { data: members } = useMembers(householdId);
  const updateTask = useUpdateTask(householdId);
  const me = useMyMember(householdId);
  const { data: household } = useMyHousehold();
  const form = useTaskForm(members ?? [], task, { householdType: household?.type });
  // Øverst for alle oppgaver med beskrivelse, også rutiner (som ikke har (i) i listene).
  const howTo = useTaskHowTo()(task, { always: true });

  const busy = updateTask.isPending || deleting;
  const error = updateTask.error ?? deleteError;

  function save() {
    const input = form.value;
    if (!input) return;
    updateTask.mutate(
      { taskId: task.id, input },
      {
        onSuccess: () => {
          if (fromTasks) revealSaved([input]);
          router.back();
        },
      },
    );
  }

  function confirmDelete() {
    Alert.alert(`Slette «${task.title}»?`, 'Oppgaven forsvinner fra listene.', [
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
      {howTo && (
        <Card>
          <HowToContent howTo={howTo} />
        </Card>
      )}
      <Text variant="metaStrong" color={colors.textWarm}>
        {isJob(task)
          ? 'Ekstrajobb'
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
      <Text variant="hint" color={colors.textMuted}>Endrer du hvor ofte, beregnes neste gang på nytt fra i dag.</Text>
      <View style={styles.delete}>
        <Button variant="danger" title="Slett oppgave" onPress={confirmDelete} disabled={busy} />
      </View>
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  delete: { marginTop: 16 },
});
