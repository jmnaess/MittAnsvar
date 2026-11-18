import { router } from 'expo-router';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useCreateTasks } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Message, ModalFormScreen } from '../../../src/ui';

export default function NewTaskScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTasks = useCreateTasks(household!.id);
  const me = useMyMember(household!.id);
  const form = useTaskForm(members ?? []);

  function save() {
    // Én oppgave per valgt person, i ett kall: enten lagres alle, eller ingen.
    if (form.values) createTasks.mutate(form.values, { onSuccess: () => router.back() });
  }

  return (
    <ModalFormScreen canSave={!!form.values} saving={createTasks.isPending} onSave={save}>
      {createTasks.error && <Message>{toNorwegianMessage(createTasks.error)}</Message>}
      <TaskFields
        form={form}
        members={members ?? []}
        canSetReward={me?.role === 'adult'}
        disabled={createTasks.isPending}
      />
    </ModalFormScreen>
  );
}
