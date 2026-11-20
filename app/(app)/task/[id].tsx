import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { HowToContent, useTaskHowTo } from '../../../src/features/tasks/components/HowToSheet';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useArchiveTask, useTasks, useUpdateTask } from '../../../src/features/tasks/hooks';
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
  const [archived, setArchived] = useState(false);

  const task = tasks?.find((t) => t.id === id);

  // Etter sletting hentes listen på nytt før vi går tilbake. Da vises ingenting i stedet for «Fant ikke».
  if (isPending || archived) return <ModalFormScreen>{null}</ModalFormScreen>;
  if (!task) {
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
      onArchived={() => setArchived(true)}
    />
  );
}

type FormProps = {
  task: Task;
  householdId: string;
  /** Åpnet fra «Oppgaver»: etter lagring vises oppgaven i segmentet der den havnet. */
  fromTasks: boolean;
  onArchived: () => void;
};

function EditTaskForm({ task, householdId, fromTasks, onArchived }: FormProps) {
  const { colors } = useTheme();
  const { data: members } = useMembers(householdId);
  const updateTask = useUpdateTask(householdId);
  const archiveTask = useArchiveTask(householdId);
  const me = useMyMember(householdId);
  const { data: household } = useMyHousehold();
  const form = useTaskForm(members ?? [], task, { householdType: household?.type });
  // Øverst for alle oppgaver med beskrivelse, også rutiner (som ikke har (i) i listene).
  const howTo = useTaskHowTo()(task, { always: true });

  const busy = updateTask.isPending || archiveTask.isPending;
  const error = updateTask.error ?? archiveTask.error;

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
