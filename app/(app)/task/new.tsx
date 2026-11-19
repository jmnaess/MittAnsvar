import { router, useLocalSearchParams } from 'expo-router';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { initialAssignees } from '../../../src/features/tasks/assignees';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useCreateTasks } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Message, ModalFormScreen } from '../../../src/ui';

/**
 * Ny oppgave fra «Oppgaver». Er en person valgt i filteret, kommer memberId med, og personen
 * er forhåndsvalgt (som «+ Ny oppgave til Leah» i «I dag»).
 */
export default function NewTaskScreen() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTasks = useCreateTasks(household!.id);
  const me = useMyMember(household!.id);
  const form = useTaskForm(members ?? [], undefined, { assignees: initialAssignees(memberId) });

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
