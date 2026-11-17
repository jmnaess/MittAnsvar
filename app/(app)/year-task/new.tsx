import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { ModalFormScreen } from '../../../src/components/ModalFormScreen';
import { colors } from '../../../src/components/theme';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import {
  useYearlyTaskForm,
  YearlyTaskFields,
} from '../../../src/features/tasks/components/YearlyTaskForm';
import { useCreateTasks } from '../../../src/features/tasks/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';

/**
 * «Ny årlig oppgave» fra «+» i årshjulet. Én oppgave per valgt måned, lagret i ett kall.
 * Etterpå er de vanlige oppgaver, og hver av dem endres for seg (trykk i årshjulet).
 */
export default function NewYearlyTaskScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTasks = useCreateTasks(household!.id);
  const form = useYearlyTaskForm();

  function save() {
    if (form.value) createTasks.mutate(form.value, { onSuccess: () => router.back() });
  }

  return (
    <ModalFormScreen canSave={!!form.value} saving={createTasks.isPending} onSave={save}>
      {createTasks.error && <Text style={styles.error}>{toNorwegianMessage(createTasks.error)}</Text>}
      <YearlyTaskFields form={form} members={members ?? []} disabled={createTasks.isPending} />
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 15 },
});
