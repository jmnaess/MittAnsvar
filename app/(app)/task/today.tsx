import { router } from 'expo-router';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useCreateTask } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Message, ModalFormScreen } from '../../../src/ui';

/**
 * «Oppgave i dag» fra pluss i «I dag» (bare voksne): tittel, hvem og lønn.
 * Lagres som en engangsoppgave med frist i dag. Databasen bruker husstandens tidssone, så en
 * dato som allerede er passert der, blir i dag. useCreateTask henter «I dag» på nytt, så
 * oppgaven vises med en gang i riktig kort.
 */
export default function TodayTaskScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTask = useCreateTask(household!.id);
  // Skjemaet starter på «I dag», og uten «Når?» blir det stående der.
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
        canSetReward
        showWhen={false}
        disabled={createTask.isPending}
      />
    </ModalFormScreen>
  );
}
