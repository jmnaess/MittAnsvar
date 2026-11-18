import { router } from 'expo-router';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useCreateTasks } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Message, ModalFormScreen } from '../../../src/ui';

/**
 * «Oppgave i dag» fra pluss i «I dag» (bare voksne): tittel, hvem og lønn.
 * Lagres som en engangsoppgave med frist i dag. Databasen bruker husstandens tidssone, så en
 * dato som allerede er passert der, blir i dag. useCreateTasks henter «I dag» på nytt, så
 * oppgaven vises med en gang i riktig kort.
 */
export default function TodayTaskScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTasks = useCreateTasks(household!.id);
  // Skjemaet starter på «I dag», og uten «Når?» blir det stående der.
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
        canSetReward
        showWhen={false}
        disabled={createTasks.isPending}
      />
    </ModalFormScreen>
  );
}
