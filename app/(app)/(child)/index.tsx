import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../../src/features/auth/SessionProvider';
import type { TodayCompletion } from '../../../src/features/completions/api';
import { DoneList } from '../../../src/features/completions/components/DoneList';
import { RecentDoneCard } from '../../../src/features/completions/components/RecentDoneCard';
import { progressText } from '../../../src/features/completions/doneToday';
import { groupRecentByDay } from '../../../src/features/completions/recent';
import {
  useCompleteTask,
  useRecentCompletions,
  useTodayCompletions,
  useUndoCompletion,
} from '../../../src/features/completions/hooks';
import { isLastOfToday, toCelebration, type Celebration } from '../../../src/features/feedback/celebration';
import { CelebrationOverlay } from '../../../src/features/feedback/components/CelebrationOverlay';
import { MyProfileButton } from '../../../src/features/household/components/MyProfileButton';
import { useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { ChildHeroCard } from '../../../src/features/motivation/components/ChildHeroCard';
import { isYoungChild, weekRange, weekStats, weekText } from '../../../src/features/motivation/heroCard';
import { useWeekCompletions } from '../../../src/features/motivation/hooks';
import { phraseForDate } from '../../../src/features/motivation/phrases';
import { MyProposalsCard } from '../../../src/features/proposals/components/MyProposalsCard';
import { ProposalSheet, type ProposalSubmit } from '../../../src/features/proposals/components/ProposalSheet';
import { useAddOwnTask, useMyProposals, useSubmitProposal } from '../../../src/features/proposals/hooks';
import { earnedLabel } from '../../../src/features/rewards/format';
import { useBalance } from '../../../src/features/rewards/hooks';
import { childTodaySections, MINE_KEY } from '../../../src/features/tasks/childToday';
import { useHowToSheet, useTaskHowTo } from '../../../src/features/tasks/components/HowToSheet';
import { TodayJobsSection } from '../../../src/features/tasks/components/TodayJobsSection';
import { TodayTaskRow } from '../../../src/features/tasks/components/TodayTaskRow';
import { UpcomingCard } from '../../../src/features/tasks/components/UpcomingCard';
import { JOBS_KEY } from '../../../src/features/tasks/groupToday';
import { useMemberUpcoming, useTodayTasks } from '../../../src/features/tasks/hooks';
import type { Task, TodayTask } from '../../../src/features/tasks/types';
import { CHILD_UPCOMING_DAYS } from '../../../src/features/tasks/upcoming';
import { formatWeekdayDate, householdToday, toIsoDate } from '../../../src/lib/dates';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { useMidnightRefetch } from '../../../src/lib/useMidnightRefetch';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';
import {
  AddFab,
  makeStyles,
  NoticeToast,
  PageHeader,
  SectionCard,
  pageWidth,
  spacing,
  Text,
  useTheme,
} from '../../../src/ui';

/**
 * «I dag» på barnets egen enhet. Øverst ChildHeroCard: hilsen, dagens framgang, uka og dagens
 * setning. Så «Mine oppgaver i dag» i barnets egen farge, og «Ekstrajobber».
 * Barnet krysser alltid av for seg selv, med ett trykk. Langt trykk gjør ingenting.
 * Nederst: «Kommende» (2 uker, uten hyppige oppgaver, som barnet ser hver dag uansett) og
 * «Gjort siste 3 dager». Den nærmeste forekomsten i «Kommende» kan krysses av tidlig.
 * Etter avkrysning vises en feiring i fullskjerm (CelebrationOverlay). Angring: trykk på den
 * utførte raden (DoneList).
 * «Legg inn» (når husstanden har slått det på) åpner ProposalSheet. Uten lønn skjer det med en
 * gang: «Legg til» gir en oppgave i «Mine oppgaver i dag», «Registrer» krysser av med feiring.
 * Med lønn blir det et forslag til de voksne. «Mine forslag» viser forslag som venter eller er
 * avslått.
 */
export default function ChildTodayScreen() {
  const { colors, personColor } = useTheme();
  const styles = useStyles();
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const me = useMyMember(householdId);
  const { session } = useSession();
  const howToOf = useTaskHowTo();
  const { infoPress, sheet: howToSheet } = useHowToSheet();
  const infoPressFor = (task: Task | TodayTask) => infoPress(howToOf(task));
  const { data: tasks, error, isPending, refetch: refetchTasks } = useTodayTasks(householdId);
  const { data: done = [], refetch: refetchDone } = useTodayCompletions(householdId);
  const today = toIsoDate(new Date());
  const { upcoming, isPending: upcomingPending, refetch: refetchUpcoming } = useMemberUpcoming(
    householdId,
    me?.id ?? null,
    today,
    { windowDays: CHILD_UPCOMING_DAYS, hideFrequent: true, enabled: !!me },
  );
  // RLS: barnet får bare sine egne avkrysninger.
  const { data: recent = [], refetch: refetchRecentQuery } = useRecentCompletions(householdId, today, !!me);
  const { data: myProposals = [], refetch: refetchProposals } = useMyProposals(householdId, !!me);
  // Uka og dagens setning går etter husstandens dato, som completed_on i databasen.
  const homeToday = householdToday(household!.timezone);
  const { monday, sunday } = weekRange(homeToday);
  const { data: weekRows = [], refetch: refetchWeek } = useWeekCompletions(householdId, me?.id, monday, sunday);
  // Dra for å oppdatere, fokus og midnatt: også «Kommende» og «Gjort siste 3 dager».
  const hasMe = !!me;
  const refetch = useCallback(
    () =>
      Promise.all([
        refetchTasks(),
        refetchDone(),
        refetchUpcoming(),
        hasMe ? refetchRecentQuery() : undefined,
        hasMe ? refetchProposals() : undefined,
        hasMe ? refetchWeek() : undefined,
      ]),
    [refetchTasks, refetchDone, refetchUpcoming, refetchRecentQuery, refetchProposals, refetchWeek, hasMe],
  );
  const pullToRefresh = usePullToRefresh(refetch);
  const day = useMidnightRefetch(refetch);
  const balance = useBalance(householdId, me?.id ?? '');
  const complete = useCompleteTask(householdId);
  const undo = useUndoCompletion(householdId);
  const insets = useSafeAreaInsets();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const submitProposal = useSubmitProposal(householdId);
  const addOwnTask = useAddOwnTask(householdId);
  const [proposalOpen, setProposalOpen] = useState(false);
  /** Satt = bekreftelsen vises. Ny key starter nedtellingen på nytt. */
  const [notice, setNotice] = useState<{ key: string; message: string } | null>(null);
  const canPropose = !!me && !!household?.child_proposals_enabled;
  const pendingProposals = myProposals.filter((p) => p.status === 'pending').length;
  /** Alle utførte vises. Ny dag: foldes inn igjen. */
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [day]);

  // Hent på nytt når fanen vises: en voksen kan ha lagt ut en ny jobb.
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const sections = me ? childTodaySections(tasks ?? [], me.id, done) : [];
  const mineSection = sections.find((s) => s.key === MINE_KEY);
  const mine = mineSection?.data ?? [];
  const mineDone = mineSection?.done ?? [];
  const jobs = sections.find((s) => s.key === JOBS_KEY)?.data ?? [];
  const color = personColor(me?.avatar);
  // «3 av 7 · 35 kr tjent»
  const right =
    [progressText(mine.length, mineDone.length), earnedLabel(balance)].filter(Boolean).join(' · ') ||
    undefined;
  const busyId = complete.isPending ? complete.variables?.taskId : undefined;
  const recentDays = me ? groupRecentByDay(recent, me.id, today) : [];

  // Fra «I dag», «Ekstrajobber» og sirkelen i «Kommende» (gjort før fristen).
  // lastToday: bare fra «Mine oppgaver i dag», når oppgaven er den siste som gjenstår.
  function markDone(task: Pick<Task, 'id'>, lastToday = false) {
    if (!me) return;
    setActionError(null);
    complete.mutate(
      { taskId: task.id, memberId: me.id, lastToday },
      {
        onSuccess: (result) => setCelebration(toCelebration(result)),
        onError: (e) => setActionError(toNorwegianMessage(e)),
      },
    );
  }

  // Trykk på en utført rad (innen 10 minutter, se DoneList): angre den.
  function undoDone(completion: TodayCompletion) {
    setActionError(null);
    undo.mutate(completion.id, {
      onSuccess: () => setCelebration((c) => (c?.completionId === completion.id ? null : c)),
      onError: (e) => setActionError(toNorwegianMessage(e)),
    });
  }

  function openProposal() {
    submitProposal.reset();
    addOwnTask.reset();
    setProposalOpen(true);
  }

  const showNotice = (message: string) => setNotice({ key: String(Date.now()), message });

  // Uten lønn: oppgave eller avkrysning med en gang. Med lønn: forslag til de voksne.
  function sendProposal(input: ProposalSubmit) {
    if (input.kind === 'send') {
      submitProposal.mutate(
        { title: input.title, isDone: input.isDone, proposedNok: input.proposedNok },
        {
          onSuccess: () => {
            setProposalOpen(false);
            showNotice('Sendt! En voksen ser på det.');
          },
        },
      );
      return;
    }
    addOwnTask.mutate(
      { title: input.title, isDone: input.kind === 'register' },
      {
        onSuccess: ({ completion }) => {
          setProposalOpen(false);
          if (completion) setCelebration(toCelebration(completion));
          else showNotice('Lagt til i dagens oppgaver.');
        },
      },
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
          right={<MyProfileButton />}
        />

        <View style={styles.body}>
          {(error || actionError) && (
            <Text variant="metaStrong" color={colors.danger}>{actionError ?? toNorwegianMessage(error)}</Text>
          )}
          {me && !isPending && (
            <ChildHeroCard
              member={me}
              open={mine.length}
              done={mineDone.length}
              week={weekText(weekStats(weekRows))}
              phrase={phraseForDate(homeToday)}
              young={isYoungChild(me, Number(homeToday.slice(0, 4)))}
              hour={new Date().getHours()}
              onAdd={canPropose ? openProposal : undefined}
            />
          )}

          {me && (mine.length > 0 || mineDone.length > 0) && (
            <SectionCard title="Mine oppgaver i dag" color={color} right={right}>
              {mine.map((task) => (
                <TodayTaskRow
                  key={task.id}
                  task={task}
                  checkColor={color.ring}
                  busy={busyId === task.id}
                  onPress={() => markDone(task, isLastOfToday(mine.map((t) => t.id), task.id))}
                  onInfoPress={infoPressFor(task)}
                />
              ))}
              <DoneList
                done={mineDone}
                // Barnets egen id: da står det ikke «Gjort av» på det barnet selv har gjort.
                sectionKey={me.id}
                allDone={mine.length === 0}
                nameOf={() => undefined}
                checkColor={color.ring}
                isAdult={false}
                userId={session?.user.id}
                busyId={undo.isPending ? undo.variables : undefined}
                onUndo={undoDone}
                expanded={expanded}
                onToggleExpanded={() => setExpanded((e) => !e)}
              />
            </SectionCard>
          )}

          <TodayJobsSection jobs={jobs} whoOf={(job) => ((job.job_member_ids ?? []).length === 0 ? 'Alle barna' : 'Til deg')} busyId={busyId} onPress={markDone} />

          <MyProposalsCard proposals={myProposals} />

          {me && (
            <>
              <UpcomingCard
                upcoming={upcoming}
                showReward
                onComplete={markDone}
                busyId={busyId}
                checkColor={color.ring}
                loading={upcomingPending}
                emptyText="Ingenting nytt de neste to ukene."
                infoPressFor={infoPressFor}
              />
              <RecentDoneCard days={recentDays} checkColor={color.ring} />
            </>
          )}
        </View>
      </ScrollView>

      {howToSheet}

      {canPropose && <AddFab label="Legg inn" onPress={openProposal} />}
      <ProposalSheet
        visible={proposalOpen}
        pendingCount={pendingProposals}
        saving={submitProposal.isPending || addOwnTask.isPending}
        error={submitProposal.error ?? addOwnTask.error}
        onSubmit={sendProposal}
        onClose={() => setProposalOpen(false)}
      />
      {notice && (
        <NoticeToast message={notice.message} resetKey={notice.key} aboveFab onHide={() => setNotice(null)} />
      )}

      {celebration && me && (
        <CelebrationOverlay celebration={celebration} member={me} onHide={() => setCelebration(null)} />
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { ...pageWidth, paddingBottom: spacing.fabClearance, gap: spacing.section },
    body: { paddingHorizontal: spacing.page, gap: spacing.section },
  }),
);
