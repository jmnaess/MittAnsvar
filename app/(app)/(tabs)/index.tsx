import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { chooseCompletionAction } from '../../../src/features/completions/chooseDoer';
import type { TodayCompletion } from '../../../src/features/completions/api';
import { DoneActionsSheet } from '../../../src/features/completions/components/DoneActionsSheet';
import { DoneList } from '../../../src/features/completions/components/DoneList';
import { MemberPickerModal } from '../../../src/features/completions/components/MemberPickerModal';
import { reassignCandidates } from '../../../src/features/completions/doneToday';
import {
  useCompleteTask,
  useReassignCompletion,
  useRemoveCompletion,
  useTodayCompletions,
  useUndoCompletion,
} from '../../../src/features/completions/hooks';
import { FeedbackToast } from '../../../src/features/feedback/components/FeedbackToast';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import type { Member } from '../../../src/features/household/types';
import { PendingApprovalBanner } from '../../../src/features/rewards/components/PendingApprovalBanner';
import { earnedLabel } from '../../../src/features/rewards/format';
import { useBalances } from '../../../src/features/rewards/hooks';
import { NewTaskSheet } from '../../../src/features/tasks/components/NewTaskSheet';
import { TaskActionsSheet } from '../../../src/features/tasks/components/TaskActionsSheet';
import { TodayJobsSection } from '../../../src/features/tasks/components/TodayJobsSection';
import { TodayTaskRow } from '../../../src/features/tasks/components/TodayTaskRow';
import { groupTodayByMember, JOBS_KEY, THIS_MONTH_KEY, type TodaySection } from '../../../src/features/tasks/groupToday';
import { usePostponeTask, useTodayTasks, useUndoPostpone } from '../../../src/features/tasks/hooks';
import { describeJobMembers } from '../../../src/features/tasks/job';
import { formatKroner } from '../../../src/features/tasks/reward';
import type { TodayTask } from '../../../src/features/tasks/types';
import { formatDate, formatWeekdayDate, toIsoDate } from '../../../src/lib/dates';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';
import {
  Card,
  colors,
  EmptyState,
  FamilyStrip,
  IconButton,
  PageHeader,
  personColor,
  SectionCard,
  sharedColors,
  spacing,
  Text,
  UndoToast,
} from '../../../src/ui';

type Toast = { completionId: string; title: string; message: string | null; reward?: string };

/** «Hvem gjorde det?»: hvilke personer som kan velges, og om en er forhåndsvalgt. */
type Picking = { task: TodayTask; members: Member[]; preselectedId: string | null };

/** En voksen retter en utført rad: valgene først, så personvelgeren ved «Endre hvem». */
type Fixing = { completion: TodayCompletion; step: 'menu' | 'pick' };

/** «Utsatt til …» med «Angre». */
type PostponedToast = { taskId: string; message: string };

/**
 * «I dag»: dato og tittel, alle i husstanden (trykk for å vise bare én), godkjenningsbanner for
 * voksne, én seksjon per person i personens farge, «Felles», «Denne måneden» og «Ledige jobber».
 * Voksne legger ut jobber med «+» og endrer dem med langt trykk.
 */
export default function TodayScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { session } = useSession();
  const { data: tasks, error, isPending, refetch: refetchTasks } = useTodayTasks(householdId);
  const { data: done = [], refetch: refetchDone } = useTodayCompletions(householdId);
  const refetch = useCallback(
    () => Promise.all([refetchTasks(), refetchDone()]),
    [refetchTasks, refetchDone],
  );
  const pullToRefresh = usePullToRefresh(refetch);
  const { data: members = [] } = useMembers(householdId);
  const { data: balances = [] } = useBalances(householdId);
  const complete = useCompleteTask(householdId);
  const undo = useUndoCompletion(householdId);
  const remove = useRemoveCompletion(householdId);
  const reassign = useReassignCompletion(householdId);
  const postpone = usePostponeTask(householdId);
  const undoPostpone = useUndoPostpone(householdId);
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState<Toast | null>(null);
  const [picking, setPicking] = useState<Picking | null>(null);
  const [fixing, setFixing] = useState<Fixing | null>(null);
  /** Voksen har trykket på raden til en åpen oppgave. */
  const [opened, setOpened] = useState<TodayTask | null>(null);
  const [postponed, setPostponed] = useState<PostponedToast | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Pluss: velg «Oppgave i dag» eller «Ledig jobb».
  const [creating, setCreating] = useState(false);
  /** Personen som vises alene (trykk i FamilyStrip), eller null for alle. */
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Hent på nytt når fanen vises igjen: datoen kan ha skiftet, eller en annen voksen har krysset av.
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const me = members.find((m) => m.auth_user_id === session?.user.id);
  const isAdult = me?.role === 'adult';
  // Voksne ser alltid «Ledige jobber», så de vet hvor jobbene havner. Ikke før listen er hentet.
  const allSections = groupTodayByMember(tasks ?? [], members, {
    showEmptyJobs: isAdult && !isPending,
    done,
  });
  const focused = members.find((m) => m.id === focusedId);
  const sections = focused ? allSections.filter((s) => s.key === focused.id) : allSections;
  const nothingToDo = !isPending && sections.every((s) => s.data.length === 0 && s.done.length === 0);

  const nameOf = (memberId: string | null) => members.find((m) => m.id === memberId)?.display_name;
  // Bare avkrysning: en rad som utsettes, skal ikke se utført ut.
  const busyId = complete.isPending ? complete.variables?.taskId : undefined;
  const today = toIsoDate(new Date());

  function markDone(task: TodayTask, memberId: string) {
    setActionError(null);
    complete.mutate(
      { taskId: task.id, memberId },
      {
        onSuccess: (result) => {
          setPostponed(null);
          setToast({
            completionId: result.completionId,
            title: task.title,
            message: result.feedbackText,
            reward: result.rewardNok
              ? `+${formatKroner(result.rewardNok)} til ${nameOf(memberId) ?? 'barnet'}`
              : undefined,
          });
        },
        onError: (e) => setActionError(toNorwegianMessage(e)),
      },
    );
  }

  // Som regel ett trykk. Ved lønn eller åpne jobber spør vi hvem som gjorde det (se chooseDoer.ts).
  function handlePress(task: TodayTask) {
    const action = chooseCompletionAction(task, me, members);
    if (action.kind === 'direct') markDone(task, action.memberId);
    if (action.kind === 'pick') {
      setPicking({ task, members: action.members, preselectedId: action.preselectedId });
    }
  }

  const pickDoer = (task: TodayTask) => setPicking({ task, members, preselectedId: null });

  // «Utsett til»: oppgaven forsvinner fra i dag og kommer tilbake på den nye datoen.
  function postponeTo(task: TodayTask, to: string) {
    setOpened(null);
    setActionError(null);
    postpone.mutate(
      { taskId: task.id, to },
      {
        onSuccess: () => {
          setToast(null);
          setPostponed({ taskId: task.id, message: `Utsatt til ${formatDate(to)}: ${task.title}` });
        },
        onError: (e) => setActionError(toNorwegianMessage(e)),
      },
    );
  }

  function handleUndoPostpone() {
    if (!postponed) return;
    undoPostpone.mutate(postponed.taskId, {
      onSuccess: () => setPostponed(null),
      onError: (e) => {
        setPostponed(null);
        setActionError(toNorwegianMessage(e));
      },
    });
  }

  // Trykk på en utført rad (innen 10 minutter, se DoneList): angre den.
  function undoDone(completion: TodayCompletion) {
    setActionError(null);
    undo.mutate(completion.id, {
      onSuccess: () => setToast((t) => (t?.completionId === completion.id ? null : t)),
      onError: (e) => setActionError(toNorwegianMessage(e)),
    });
  }

  // Voksne, hele dagen: «Ikke gjort» fjerner avkrysningen.
  function removeDone(completion: TodayCompletion) {
    setFixing(null);
    setActionError(null);
    remove.mutate(completion.id, {
      onSuccess: () => setToast((t) => (t?.completionId === completion.id ? null : t)),
      onError: (e) => setActionError(toNorwegianMessage(e)),
    });
  }

  // Trykk på sirkelen: bekreft først. «Ikke gjort» i valgene er allerede et bevisst valg, og en
  // Alert mens Sheet lukkes kan forsvinne på iOS.
  function confirmRemove(completion: TodayCompletion) {
    Alert.alert('Merke som ikke gjort?', completion.title, [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Ikke gjort', style: 'destructive', onPress: () => removeDone(completion) },
    ]);
  }

  // «Endre hvem som gjorde det»: flytter avkrysningen (og eventuell lønn) til en annen.
  function reassignDone(completion: TodayCompletion, member: Member) {
    setFixing(null);
    if (member.id === completion.completed_by_member_id) return;
    setActionError(null);
    reassign.mutate(
      { completionId: completion.id, memberId: member.id },
      { onError: (e) => setActionError(toNorwegianMessage(e)) },
    );
  }

  const fixingBusyId = remove.isPending
    ? remove.variables
    : reassign.isPending
      ? reassign.variables?.completionId
      : undefined;

  function handleUndo() {
    if (!toast) return;
    undo.mutate(toast.completionId, {
      onSuccess: () => setToast(null),
      onError: (e) => {
        setToast(null);
        setActionError(toNorwegianMessage(e));
      },
    });
  }

  function renderRows(section: TodaySection, checkColor: string, muted = false) {
    const open = section.data.map((task) => (
      <TodayTaskRow
        key={task.id}
        task={task}
        assigneeName={section.key === THIS_MONTH_KEY ? (nameOf(task.assigned_member_id) ?? 'Felles') : undefined}
        checkColor={checkColor}
        muted={muted}
        busy={busyId === task.id}
        onPress={() => handlePress(task)}
        onOpen={isAdult ? () => setOpened(task) : undefined}
        onLongPress={() => pickDoer(task)}
      />
    ));
    return (
      <>
        {open}
        <DoneList
          done={section.done}
          sectionKey={section.key}
          allDone={section.data.length === 0}
          nameOf={(id) => nameOf(id)}
          checkColor={checkColor}
          isAdult={isAdult}
          userId={session?.user.id}
          busyId={undo.isPending ? undo.variables : fixingBusyId}
          onUndo={undoDone}
          adultActions={{
            onRemove: confirmRemove,
            onOpen: (completion) => setFixing({ completion, step: 'menu' }),
          }}
        />
      </>
    );
  }

  function renderSection(section: TodaySection) {
    if (section.key === JOBS_KEY) {
      return (
        <TodayJobsSection
          key={section.key}
          jobs={section.data}
          whoOf={(job) => describeJobMembers(job.job_member_ids ?? [], members)}
          busyId={busyId}
          onPress={handlePress}
          onLongPress={
            isAdult ? (job) => router.push({ pathname: '/job/[id]', params: { id: job.id } }) : undefined
          }
          emptyText={isAdult ? 'Ingen ledige jobber. Trykk + for å legge ut en.' : undefined}
        />
      );
    }
    if (section.key === THIS_MONTH_KEY) {
      return (
        <Card key={section.key}>
          <Text variant="sectionTitle" accessibilityRole="header">{section.title}</Text>
          {renderRows(section, colors.primary, true)}
        </Card>
      );
    }
    const member = section.member;
    const color = member ? personColor(member.avatar) : sharedColors;
    const right =
      member?.role === 'child'
        ? earnedLabel(balances.find((b) => b.member_id === member.id))
        : undefined;
    return (
      <SectionCard key={section.key} title={section.title} color={color} avatar={member?.avatar} right={right}>
        {renderRows(section, color.ring)}
      </SectionCard>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl {...pullToRefresh} tintColor={colors.primary} />}
      >
        <PageHeader
          overline={formatWeekdayDate(today)}
          title="I dag"
          right={
            isAdult ? (
              <IconButton icon="add" accessibilityLabel="Ny oppgave eller ledig jobb" onPress={() => setCreating(true)} />
            ) : undefined
          }
        />

        {members.length > 1 && (
          <FamilyStrip
            people={members.map((m) => ({ id: m.id, name: m.display_name, avatar: m.avatar }))}
            selectedId={focusedId}
            onSelect={setFocusedId}
          />
        )}

        <View style={styles.body}>
          {(error || actionError) && (
            <Text variant="metaStrong" color={colors.danger}>{actionError ?? toNorwegianMessage(error)}</Text>
          )}
          {/* Steg 10b: barnas avkrysninger med lønn som venter. Vises bare når noe venter. */}
          {isAdult && <PendingApprovalBanner householdId={householdId} members={members} />}
          {nothingToDo && (
            <EmptyState
              title={focused ? `Ingenting på ${focused.display_name} i dag 🎉` : 'Ingenting å gjøre i dag 🎉'}
              text={focused ? 'Trykk på navnet igjen for å se alle.' : 'Nye oppgaver lager du under «Oppgaver».'}
            />
          )}
          {sections.map(renderSection)}
        </View>
      </ScrollView>

      <MemberPickerModal
        taskTitle={picking?.task.title ?? null}
        members={picking?.members ?? members}
        preselectedId={picking?.preselectedId}
        meId={me?.id}
        onClose={() => setPicking(null)}
        onPick={(member) => {
          if (picking) markDone(picking.task, member.id);
          setPicking(null);
        }}
      />

      <DoneActionsSheet
        taskTitle={fixing?.step === 'menu' ? fixing.completion.title : null}
        onClose={() => setFixing(null)}
        onRemove={() => fixing && removeDone(fixing.completion)}
        onReassign={() => fixing && setFixing({ ...fixing, step: 'pick' })}
      />

      <MemberPickerModal
        taskTitle={fixing?.step === 'pick' ? fixing.completion.title : null}
        members={fixing ? reassignCandidates(fixing.completion, members) : []}
        preselectedId={fixing?.completion.completed_by_member_id}
        meId={me?.id}
        confirmLabel="Lagre"
        onClose={() => setFixing(null)}
        onPick={(member) => fixing && reassignDone(fixing.completion, member)}
      />

      <TaskActionsSheet
        taskTitle={opened?.title ?? null}
        today={today}
        onClose={() => setOpened(null)}
        onPostpone={(to) => opened && postponeTo(opened, to)}
        onPickDoer={() => {
          if (opened) pickDoer(opened);
          setOpened(null);
        }}
      />

      <NewTaskSheet
        visible={creating}
        onClose={() => setCreating(false)}
        taskLabel="Oppgave i dag"
        taskHref="/task/today"
      />

      {toast && (
        <FeedbackToast
          resetKey={toast.completionId}
          title={toast.title}
          message={toast.message}
          reward={toast.reward}
          undoing={undo.isPending}
          onUndo={handleUndo}
          onHide={() => setToast(null)}
        />
      )}

      {postponed && (
        <UndoToast
          resetKey={postponed.taskId}
          message={postponed.message}
          undoing={undoPostpone.isPending}
          onUndo={handleUndoPostpone}
          onHide={() => setPostponed(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  // Ekstra plass nederst, så banneret ikke dekker den siste oppgaven.
  container: { paddingBottom: 120, gap: spacing.section },
  body: { paddingHorizontal: spacing.page, gap: spacing.section },
});
