import { router, useLocalSearchParams } from 'expo-router';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import {
  useYearlyTaskForm,
  YearlyTaskFields,
} from '../../../src/features/tasks/components/YearlyTaskForm';
import { useCreateTasks } from '../../../src/features/tasks/hooks';
import { isFromTasks, revealSaved } from '../../../src/features/tasks/tasksSegment';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Message, ModalFormScreen } from '../../../src/ui';

/**
 * «Ny årlig oppgave» fra «+» i årshjulet. Én oppgave per valgt måned, lagret i ett kall.
 * Etterpå er de vanlige oppgaver, og hver av dem endres for seg (trykk i årshjulet).
 */
export default function NewYearlyTaskScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTasks = useCreateTasks(household!.id);
  const form = useYearlyTaskForm(members ?? [], household?.type);
  const params = useLocalSearchParams<{ from?: string }>();

  function save() {
    const values = form.value;
    if (!values) return;
    createTasks.mutate(values, {
      onSuccess: () => {
        // Fra «Oppgaver»: rull til måneden oppgaven havnet i.
        if (isFromTasks(params)) revealSaved(values);
        router.back();
      },
    });
  }

  return (
    <ModalFormScreen canSave={!!form.value} saving={createTasks.isPending} onSave={save}>
      {createTasks.error && <Message>{toNorwegianMessage(createTasks.error)}</Message>}
      <YearlyTaskFields form={form} members={members ?? []} disabled={createTasks.isPending} />
    </ModalFormScreen>
  );
}
