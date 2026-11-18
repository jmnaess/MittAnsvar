import { router } from 'expo-router';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useCreateTask } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Message, ModalFormScreen } from '../../../src/ui';

export default function NewTaskScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTask = useCreateTask(household!.id);
  const me = useMyMember(household!.id);
  const form = useTaskForm();

  function save() {
    if (form.value) createTask.mutate(form.value, { onSuccess: () => router.back() });
  }

  return (
    <ModalFormScreen canSave={!!form.value} saving={createTask.isPending} onSave={save}>
      {createTask.error && <Message>{toNorwegianMessage(createTask.error)}</Message>}
      <TaskFields
        form={form}
        members={members ?? []}
        canSetReward={me?.role === 'adult'}
        disabled={createTask.isPending}
      />
    </ModalFormScreen>
  );
}
