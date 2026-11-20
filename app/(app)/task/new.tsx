import { router, useLocalSearchParams } from 'expo-router';
import { useMembers, useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { initialAssignees } from '../../../src/features/tasks/assignees';
import { TaskFields, useTaskForm } from '../../../src/features/tasks/components/TaskForm';
import { useCreateTasks } from '../../../src/features/tasks/hooks';
import { isFromTasks, revealSaved } from '../../../src/features/tasks/tasksSegment';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Message, ModalFormScreen } from '../../../src/ui';

/**
 * Ny oppgave fra plussen i «I dag» og «Oppgaver», og fra «+ Ny oppgave til Leah» i personvisningen.
 * «Når?» starter på «I dag». Er en person valgt (personvisningen eller filteret i «Oppgaver»),
 * kommer memberId med, og personen er forhåndsvalgt. Databasen flytter en dato som er passert i
 * husstandens tidssone til i dag, og useCreateTasks henter «I dag» på nytt.
 */
export default function NewTaskScreen() {
  const params = useLocalSearchParams<{ memberId?: string; from?: string }>();
  const { memberId } = params;
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: members } = useMembers(household!.id);
  const createTasks = useCreateTasks(household!.id);
  const me = useMyMember(household!.id);
  const form = useTaskForm(members ?? [], undefined, {
    assignees: initialAssignees(memberId),
    householdType: household?.type,
  });

  function save() {
    // Én oppgave per valgt person, i ett kall: enten lagres alle, eller ingen.
    const values = form.values;
    if (!values) return;
    createTasks.mutate(values, {
      onSuccess: () => {
        // Fra «Oppgaver»: vis oppgaven i segmentet der den havnet.
        if (isFromTasks(params)) revealSaved(values);
        router.back();
      },
    });
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
