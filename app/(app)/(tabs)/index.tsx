import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { chooseCompletionAction } from '../../../src/features/completions/chooseDoer';
import type { RecentCompletion, TodayCompletion } from '../../../src/features/completions/api';
import { RecentDoneCard } from '../../../src/features/completions/components/RecentDoneCard';
import { DoneList } from '../../../src/features/completions/components/DoneList';
import { MemberPickerModal } from '../../../src/features/completions/components/MemberPickerModal';
import { progressText, reassignCandidates } from '../../../src/features/completions/doneToday';
import { groupRecentByDay } from '../../../src/features/completions/recent';
import {
  useCompleteTask,
  useReassignCompletion,
  useRecentCompletions,
  useRemoveCompletion,
  useTodayCompletions,
  useUndoCompletion,
} from '../../../src/features/completions/hooks';
import { FeedbackToast } from '../../../src/features/feedback/components/FeedbackToast';
import { MyProfileButton } from '../../../src/features/household/components/MyProfileButton';
import { useMemberPhotoLookup, useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import type { Member } from '../../../src/features/household/types';
import { ExpiringCard } from '../../../src/features/preparedness/components/ExpiringCard';
import { useInvalidatePreparedness } from '../../../src/features/preparedness/hooks';
import { PendingApprovalBanner } from '../../../src/features/rewards/components/PendingApprovalBanner';
import { earnedLabel } from '../../../src/features/rewards/format';
import { useBalances } from '../../../src/features/rewards/hooks';
import { useHowToSheet, useTaskHowTo } from '../../../src/features/tasks/components/HowToSheet';
import { todayAddMenu } from '../../../src/features/tasks/addMenu';
import { TodayJobsSection } from '../../../src/features/tasks/components/TodayJobsSection';
import { TaskRowMenu } from '../../../src/features/tasks/components/TaskRowMenu';
import { TodayTaskRow } from '../../../src/features/tasks/components/TodayTaskRow';
import { UpcomingCard } from '../../../src/features/tasks/components/UpcomingCard';
import {
  cardDoerId,
  focusSections,
  groupTodayByMember,
  JOBS_KEY,
  THIS_MONTH_KEY,
  type TodaySection,
} from '../../../src/features/tasks/groupToday';
import {
  useMemberUpcoming,
  usePostponeTask,
  useTasks,
  useTodayTasks,
  useUndoPostpone,
} from '../../../src/features/tasks/hooks';
import { newTaskForLabel } from '../../../src/features/tasks/assignees';
import { describeJobMembers } from '../../../src/features/tasks/job';
import { formatKroner } from '../../../src/features/tasks/reward';
import { editHref, rowActions, rowPress, type RowAction } from '../../../src/features/tasks/rowActions';
import type { Task, TodayTask } from '../../../src/features/tasks/types';
import { UPCOMING_DAYS } from '../../../src/features/tasks/upcoming';
import { formatDate, formatWeekdayDate, toIsoDate } from '../../../src/lib/dates';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { useMidnightRefetch } from '../../../src/lib/useMidnightRefetch';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';
import {
  AddFab,
  Button,
  Card,
  EmptyState,
  FamilyStrip,
  makeStyles,
  PageHeader,
  SectionCard,
  pageWidth,
  spacing,
  Text,
  UndoToast,
  useTheme,
} from '../../../src/ui';

type Toast = { completionId: string; title: string; message: string | null; reward?: string };

/** Det som trengs for å krysse av: fra «I dag» (TodayTask) eller «Kommende» (Task). */
type Completable = Pick<
  Task,
  'id' | 'title' | 'recurrence_type' | 'assigned_member_id' | 'job_member_ids' | 'reward_nok'
>;

/** «Hvem gjorde det?»: hvilke personer som kan velges, og om en er forhåndsvalgt. */
type Picking = { task: Completable; members: Member[]; preselectedId: string | null };

/** Raden en voksen har trykket på. Se TaskRowMenu. */
type RowMenu =
  | { kind: 'open'; task: TodayTask }
  | { kind: 'upcoming'; task: Task; checkable: boolean }
  | { kind: 'done'; completion: TodayCompletion }
  | { kind: 'recent'; completion: RecentCompletion };

/** «Utsatt til …» med «Angre». */
type PostponedToast = { taskId: string; message: string };

/**
 * «I dag»: dato og tittel, alle i husstanden (trykk for å vise bare én), godkjenningsbanner for
 * voksne, én seksjon per person i personens farge, «Felles», «Ekstrajobber», «Denne måneden»
 * (årshjulet) og «Kommende» for hele husstanden: 8 uker, uten hyppige oppgaver, med navn på
 * raden og «Neste måned» nederst.
 * Voksne legger ut jobber med «+» og endrer dem med langt trykk. For voksne gir trykk på en
 * oppgaverad «Hvem gjorde …?» (utført: «Endre hvem som gjorde det»), langt trykk åpner valgene
 * (TaskRowMenu, rowActions.ts), og sirkelen krysser av. Menyen har ikke «hvem»-valgene når
 * trykket gir dem. Rader uten noe å velge (én person, senere i «Kommende», «Gjort siste 3
 * dager») åpner valgene også ved trykk.
 *
 * Personvisning (én person valgt): personens kort, personens oppgaver «Denne måneden»,
 * «Kommende» (8 uker, sirkelen krysser av den nærmeste forekomsten tidlig, «Neste måned»
 * nederst) og «Gjort siste 3 dager». Er personen voksen, kommer felles årshjul-oppgaver også med
 * (merket «Felles»): med frist i dag eller forfalt i kortet, månedsoppgaver i «Denne måneden» og
 * med dato i «Kommende». Barn ser bare sine egne.
 */
export default function TodayScreen() {
  const { colors, personColor, sharedColors } = useTheme();
  const styles = useStyles();
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { session } = useSession();
  const { data: tasks, error, isPending, refetch: refetchTasks } = useTodayTasks(householdId);
  const { data: done = [], refetch: refetchDone } = useTodayCompletions(householdId);
  /** Personen som vises alene (trykk i FamilyStrip), eller null for alle. */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const { data: members = [] } = useMembers(householdId);
  const focused = members.find((m) => m.id === focusedId);
  // En voksen valgt: også felles årshjul-oppgaver (i dag, «Denne måneden» og «Kommende»). Aldri barn.
  const sharedYear = focused?.role === 'adult';
  const today = toIsoDate(new Date());
  // «Kommende»: personen som er valgt, eller hele husstanden uten de hyppige oppgavene.
  const { upcoming, isPending: upcomingPending, refetch: refetchUpcoming } = useMemberUpcoming(
    householdId,
    focusedId,
    today,
    { windowDays: UPCOMING_DAYS, hideFrequent: focusedId === null, includeSharedYear: sharedYear },
  );
  // Aktive oppgaver: en utført rad kan bare endres hvis oppgaven fortsatt finnes.
  const { data: activeTasks = [], refetch: refetchActiveTasks } = useTasks(householdId);
  const { data: recent = [], refetch: refetchRecentQuery } = useRecentCompletions(
    householdId,
    today,
    focusedId !== null,
  );
  // Beredskapslageret: varer som snart går ut (ExpiringCard).
  const refetchPreparedness = useInvalidatePreparedness(householdId);
  // Dra for å oppdatere, fokus og midnatt: også personvisningen når en person er valgt.
  const refetch = useCallback(
    () =>
      Promise.all([
        refetchTasks(),
        refetchDone(),
        refetchUpcoming(),
        refetchActiveTasks(),
        focusedId !== null ? refetchRecentQuery() : undefined,
        refetchPreparedness(),
      ]),
    [refetchTasks, refetchDone, refetchUpcoming, refetchActiveTasks, refetchRecentQuery, focusedId, refetchPreparedness],
  );
  const pullToRefresh = usePullToRefresh(refetch);
  const day = useMidnightRefetch(refetch);
  const photoOf = useMemberPhotoLookup(householdId);
  const { data: balances = [] } = useBalances(householdId);
  const complete = useCompleteTask(householdId);
  const undo = useUndoCompletion(householdId);
  const remove = useRemoveCompletion(householdId);
  const reassign = useReassignCompletion(householdId);
  const postpone = usePostponeTask(householdId);
  const undoPostpone = useUndoPostpone(householdId);
  const insets = useSafeAreaInsets();
  const howToOf = useTaskHowTo();
  const { infoPress, sheet: howToSheet } = useHowToSheet();
  const infoPressFor = (task: Task | TodayTask) => infoPress(howToOf(task));

  const [toast, setToast] = useState<Toast | null>(null);
  const [picking, setPicking] = useState<Picking | null>(null);
  /** «Endre hvem som gjorde det»: personvelgeren er åpen for denne avkrysningen. */
  const [reassigning, setReassigning] = useState<TodayCompletion | null>(null);
  // Raden beholdes mens menyen lukkes, så innholdet ikke forsvinner under animasjonen.
  const [menu, setMenu] = useState<RowMenu | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [postponed, setPostponed] = useState<PostponedToast | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Kort der alle utførte er foldet ut (seksjonsnøkler). Ny dag: alt foldes inn igjen. */
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  useEffect(() => setExpandedKeys(new Set()), [day]);

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Hent på nytt når fanen vises igjen: datoen kan ha skiftet, eller en annen voksen har krysset av.
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const me = members.find((m) => m.auth_user_id === session?.user.id);
  const isAdult = me?.role === 'adult';
  // Voksne ser alltid «Ekstrajobber», så de vet hvor jobbene havner. Ikke før listen er hentet.
  // Personvisning: alle personer får kort, så personens kort finnes selv om det bare får felles
  // årshjul-oppgaver. Tomme kort fjernes under.
  const allSections = groupTodayByMember(tasks ?? [], members, {
    showEmptyJobs: isAdult && !isPending,
    showAllMembers: focused !== undefined,
    done,
  });
  // Personvisning: personens kort og personens oppgaver i «Denne måneden» (voksne: også felles
  // årshjul-oppgaver, se focusSections).
  const sections = focused
    ? focusSections(allSections, focused.id, { includeShared: sharedYear }).filter(
        (s) => s.data.length > 0 || s.done.length > 0,
      )
    : allSections;
  const nothingToDo = !isPending && sections.every((s) => s.data.length === 0 && s.done.length === 0);

  const nameOf = (memberId: string | null) => members.find((m) => m.id === memberId)?.display_name;
  // Bare avkrysning: en rad som utsettes, skal ikke se utført ut.
  const busyId = complete.isPending ? complete.variables?.taskId : undefined;
  const recentDays = focused ? groupRecentByDay(recent, focused.id, today) : [];

  function markDone(task: Completable, memberId: string) {
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
  // Også sirkelen i «Kommende»: da er oppgaven gjort før fristen.
  function handlePress(task: Completable) {
    const action = chooseCompletionAction(task, me, members);
    if (action.kind === 'direct') markDone(task, action.memberId);
    if (action.kind === 'pick') {
      setPicking({ task, members: action.members, preselectedId: action.preselectedId });
    }
  }

  // Sirkelen i «I dag». En felles rad i personens kort (personvisningen): gjort av personen.
  function pressCheck(section: TodaySection, task: TodayTask) {
    const doerId = isAdult ? cardDoerId(section, task) : null;
    if (doerId) markDone(task, doerId);
    else handlePress(task);
  }

  const pickDoer = (task: Completable) => setPicking({ task, members, preselectedId: null });

  function openMenu(row: RowMenu) {
    setMenu(row);
    setMenuOpen(true);
  }
  const closeMenu = () => setMenuOpen(false);

  const isActiveTask = (taskId: string) => activeTasks.some((t) => t.id === taskId);
  const canPickDoer = members.length > 1;
  const canReassign = (c: TodayCompletion) =>
    reassignCandidates(c, members).some((m) => m.id !== c.completed_by_member_id);

  // Trykk på en rad (voksne): «Hvem gjorde …?» når det går, ellers valgene.
  // Samme regel som menyen (rowPress i rowActions.ts), så «hvem»-valget aldri forsvinner.
  const pressOpenRow = (task: TodayTask) =>
    rowPress({ kind: 'open', canPickDoer }) === 'pickDoer'
      ? pickDoer(task)
      : openMenu({ kind: 'open', task });
  const pressUpcomingRow = (task: Task, checkable: boolean) =>
    rowPress({ kind: 'upcoming', checkable, canPickDoer }) === 'pickDoer'
      ? pickDoer(task)
      : openMenu({ kind: 'upcoming', task, checkable });
  const pressDoneRow = (completion: TodayCompletion) =>
    rowPress({ kind: 'done', canReassign: canReassign(completion), canEdit: true }) === 'reassign'
      ? setReassigning(completion)
      : openMenu({ kind: 'done', completion });

  function menuActions(row: RowMenu | null): RowAction[] {
    if (!row) return [];
    switch (row.kind) {
      case 'open':
        return rowActions({ kind: 'open', canPickDoer });
      case 'upcoming':
        return rowActions({ kind: 'upcoming', checkable: row.checkable, canPickDoer });
      case 'done':
        return rowActions({
          kind: 'done',
          canReassign: canReassign(row.completion),
          canEdit: isActiveTask(row.completion.task_id),
        });
      case 'recent':
        return rowActions({ kind: 'recent', canEdit: isActiveTask(row.completion.task_id) });
    }
  }

  // Oppgaven menyen gjelder, når raden er åpen eller kommende.
  const menuTask = menu?.kind === 'open' || menu?.kind === 'upcoming' ? menu.task : null;
  const menuCompletion = menu?.kind === 'done' || menu?.kind === 'recent' ? menu.completion : null;

  // «Endre oppgave»: samme skjerm som fra «Oppgaver». Jobber har sitt eget skjema.
  function editFromMenu() {
    closeMenu();
    if (menuTask) router.push(editHref(menuTask.id, menuTask.recurrence_type));
    else if (menuCompletion) router.push(editHref(menuCompletion.task_id, menuCompletion.recurrence_type));
  }

  // «Utsett til»: oppgaven flyttes og kommer tilbake på den nye datoen.
  function postponeTo(task: Pick<Task, 'id' | 'title'>, to: string) {
    closeMenu();
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
    closeMenu();
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
    setReassigning(null);
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

  // «Denne måneden»: hvem (eller «Felles»). Personens kort: «Felles» på felles årshjul-oppgaver.
  function assigneeName(section: TodaySection, task: TodayTask): string | undefined {
    if (section.key === THIS_MONTH_KEY) return nameOf(task.assigned_member_id) ?? 'Felles';
    if (section.member && task.assigned_member_id === null) return 'Felles';
    return undefined;
  }

  function renderRows(section: TodaySection, checkColor: string, muted = false) {
    const open = section.data.map((task) => (
      <TodayTaskRow
        key={task.id}
        task={task}
        assigneeName={assigneeName(section, task)}
        checkColor={checkColor}
        muted={muted}
        busy={busyId === task.id}
        onPress={() => pressCheck(section, task)}
        onRowPress={isAdult ? () => pressOpenRow(task) : undefined}
        onLongPress={isAdult ? () => openMenu({ kind: 'open', task }) : () => pickDoer(task)}
        longPressHint={isAdult ? 'Trykk for å velge hvem som gjorde det. Hold inne for valg' : undefined}
        onInfoPress={infoPressFor(task)}
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
            onPress: pressDoneRow,
            onOpen: (completion) => openMenu({ kind: 'done', completion }),
          }}
          expanded={expandedKeys.has(section.key)}
          onToggleExpanded={() => toggleExpanded(section.key)}
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
          emptyText={isAdult ? 'Ingen ekstrajobber nå. Trykk + for å legge ut en.' : undefined}
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
    const earned =
      member?.role === 'child'
        ? earnedLabel(balances.find((b) => b.member_id === member.id))
        : undefined;
    // «3 av 7 · 35 kr tjent»: fremdrift i dag, og saldo for barn.
    const right =
      [progressText(section.data.length, section.done.length), earned].filter(Boolean).join(' · ') ||
      undefined;
    return (
      <SectionCard key={section.key} title={section.title} color={color} avatar={member?.avatar} photo={photoOf(member)} right={right}>
        {renderRows(section, color.ring)}
      </SectionCard>
    );
  }

  const addItems = todayAddMenu({ isAdult, memberId: focusedId });
  const hasFab = addItems.length > 0;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl {...pullToRefresh} tintColor={colors.primary} />}
      >
        <PageHeader
          overline={formatWeekdayDate(today)}
          title="I dag"
          right={<MyProfileButton />}
        />

        {members.length > 1 && (
          <FamilyStrip
            people={members.map((m) => ({ id: m.id, name: m.display_name, avatar: m.avatar, photo: photoOf(m) }))}
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
              text={focused ? 'Trykk på navnet igjen for å se alle.' : 'Legg inn oppgaver under «Oppgaver», så ser alle hva som er deres.'}
            />
          )}
          {sections.map(renderSection)}
          {/* Beredskapslageret: varer som går ut innen fire uker. Bare voksne, bare for alle. */}
          {isAdult && !focused && <ExpiringCard today={today} />}
          {!focused && !isPending && (
            <UpcomingCard
              upcoming={upcoming}
              showReward={(task) => members.find((m) => m.id === task.assigned_member_id)?.role === 'child'}
              nameOf={(task) => nameOf(task.assigned_member_id) ?? 'Felles'}
              onComplete={handlePress}
              busyId={busyId}
              checkColor={colors.primary}
              loading={upcomingPending}
              emptyText="Ingenting planlagt de neste ukene."
              infoPressFor={infoPressFor}
              onRowPress={isAdult ? pressUpcomingRow : undefined}
              onLongPress={
                isAdult
                  ? (task, checkable) => openMenu({ kind: 'upcoming', task, checkable })
                  : undefined
              }
            />
          )}
          {focused && (
            <>
              {/* Rett under personens kort: ny oppgave (starter på «I dag») med personen forhåndsvalgt. */}
              {isAdult && (
                <View style={styles.newTaskFor}>
                  <Button
                    variant="secondary"
                    small
                    title={newTaskForLabel(focused.display_name)}
                    onPress={() =>
                      router.push({ pathname: '/task/new', params: { memberId: focused.id } })
                    }
                  />
                </View>
              )}
              <UpcomingCard
                upcoming={upcoming}
                showReward={focused.role === 'child'}
                nameOf={(task) => (task.assigned_member_id === null ? 'Felles' : undefined)}
                onComplete={handlePress}
                busyId={busyId}
                checkColor={personColor(focused.avatar).ring}
                loading={upcomingPending}
                emptyText="Ingenting planlagt de neste ukene."
                infoPressFor={infoPressFor}
                onRowPress={isAdult ? pressUpcomingRow : undefined}
                onLongPress={
                  isAdult
                    ? (task, checkable) => openMenu({ kind: 'upcoming', task, checkable })
                    : undefined
                }
              />
              <RecentDoneCard
                days={recentDays}
                checkColor={personColor(focused.avatar).ring}
                rowPress={
                  isAdult
                    ? (completion) =>
                        isActiveTask(completion.task_id)
                          ? () => openMenu({ kind: 'recent', completion })
                          : undefined
                    : undefined
                }
              />
            </>
          )}
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

      <MemberPickerModal
        taskTitle={reassigning?.title ?? null}
        members={reassigning ? reassignCandidates(reassigning, members) : []}
        preselectedId={reassigning?.completed_by_member_id}
        meId={me?.id}
        confirmLabel="Lagre"
        onClose={() => setReassigning(null)}
        onPick={(member) => reassigning && reassignDone(reassigning, member)}
      />

      <TaskRowMenu
        visible={menuOpen}
        title={menuTask?.title ?? menuCompletion?.title ?? ''}
        actions={menuActions(menu)}
        today={today}
        postponeFrom={menu?.kind === 'upcoming' ? (menu.task.next_due_on ?? today) : today}
        onClose={closeMenu}
        onPostpone={(to) => menuTask && postponeTo(menuTask, to)}
        onPickDoer={() => {
          closeMenu();
          if (menuTask) pickDoer(menuTask);
        }}
        onRemove={() => menu?.kind === 'done' && removeDone(menu.completion)}
        onReassign={() => {
          closeMenu();
          if (menu?.kind === 'done') setReassigning(menu.completion);
        }}
        onEdit={editFromMenu}
      />

      {howToSheet}

      {/* Pluss nede til høyre (bare voksne). Valgt person forhåndsvelges i «Ny oppgave». */}
      {addItems.length > 0 && (
        <AddFab items={addItems.map((item) => ({ ...item, onPress: () => router.push(item.href) }))} />
      )}

      {toast && (
        <FeedbackToast
          resetKey={toast.completionId}
          title={toast.title}
          message={toast.message}
          reward={toast.reward}
          undoing={undo.isPending}
          onUndo={handleUndo}
          onHide={() => setToast(null)}
          aboveFab={hasFab}
        />
      )}

      {postponed && (
        <UndoToast
          resetKey={postponed.taskId}
          message={postponed.message}
          undoing={undoPostpone.isPending}
          onUndo={handleUndoPostpone}
          onHide={() => setPostponed(null)}
          aboveFab={hasFab}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    // Ekstra plass nederst, så plussen og banneret ikke dekker den siste oppgaven.
    container: { ...pageWidth, paddingBottom: spacing.fabClearance, gap: spacing.section },
    body: { paddingHorizontal: spacing.page, gap: spacing.section },
    // Ikke full bredde: tydelig, men skal ikke dominere over kortene.
    newTaskFor: { alignSelf: 'flex-start' },
  }),
);
