import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { ModalFormScreen } from '../../../src/components/ModalFormScreen';
import { colors } from '../../../src/components/theme';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useCreateTask } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function NewTaskScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTask = useCreateTask(household!.id);
  const form = useTaskForm();

  function save() {
    if (form.value) createTask.mutate(form.value, { onSuccess: () => router.back() });
  }

  return (
    <ModalFormScreen canSave={!!form.value} saving={createTask.isPending} onSave={save}>
      {createTask.error && <Text style={styles.error}>{toNorwegianMessage(createTask.error)}</Text>}
      <TaskFields form={form} members={members ?? []} disabled={createTask.isPending} />
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 15 },
});
