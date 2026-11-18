import { router } from 'expo-router';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { JobFields, useJobForm } from '../../../src/features/tasks/components/JobForm';
import { useCreateTask } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Message, ModalFormScreen } from '../../../src/ui';

/** «Ny ledig jobb» fra «+» i «I dag». Lagres som en vanlig oppgave av typen job. */
export default function NewJobScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTask = useCreateTask(household!.id);
  const form = useJobForm();

  function save() {
    if (form.value) createTask.mutate(form.value, { onSuccess: () => router.back() });
  }

  return (
    <ModalFormScreen canSave={!!form.value} saving={createTask.isPending} onSave={save}>
      {createTask.error && <Message>{toNorwegianMessage(createTask.error)}</Message>}
      <JobFields form={form} members={members ?? []} disabled={createTask.isPending} />
    </ModalFormScreen>
  );
}
