import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { ModalFormScreen } from '../../../src/components/ModalFormScreen';
import { colors } from '../../../src/components/theme';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { JobFields, useJobForm } from '../../../src/features/tasks/components/JobForm';
import { useCreateTask } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';

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
      {createTask.error && <Text style={styles.error}>{toNorwegianMessage(createTask.error)}</Text>}
      <JobFields form={form} members={members ?? []} disabled={createTask.isPending} />
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 15 },
});
