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
import { FeedbackToast } from '../../../src/features/feedback/components/FeedbackToast';
import { MemberAvatar } from '../../../src/features/household/components/MemberAvatar';
import { useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { earnedLabel } from '../../../src/features/rewards/format';
import { useBalance } from '../../../src/features/rewards/hooks';
import { childTodaySections, MINE_KEY } from '../../../src/features/tasks/childToday';
import { TodayJobsSection } from '../../../src/features/tasks/components/TodayJobsSection';
import { TodayTaskRow } from '../../../src/features/tasks/components/TodayTaskRow';
import { UpcomingCard } from '../../../src/features/tasks/components/UpcomingCard';
import { JOBS_KEY } from '../../../src/features/tasks/groupToday';
import { useMemberUpcoming, useTodayTasks } from '../../../src/features/tasks/hooks';
import { formatKroner } from '../../../src/features/tasks/reward';
import type { Task } from '../../../src/features/tasks/types';
import { CHILD_UPCOMING_DAYS } from '../../../src/features/tasks/upcoming';
import { formatWeekdayDate, toIsoDate } from '../../../src/lib/dates';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { useMidnightRefetch } from '../../../src/lib/useMidnightRefetch';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';
import {
  EmptyState,
  makeStyles,
  PageHeader,
  SectionCard,
  pageWidth,
  spacing,
  Text,
  useTheme,
} from '../../../src/ui';

type Toast = { completionId: string; title: string; message: string | null; reward?: string };

/**
 * «I dag» på barnets egen enhet: «Mine oppgaver i dag» i barnets egen farge, og «Ledige jobber».
 * Barnet krysser alltid av for seg selv, med ett trykk. Langt trykk gjør ingenting.
 * Nederst: «Kommende» (2 uker, uten hyppige oppgaver, som barnet ser hver dag uansett) og
 * «Gjort siste 3 dager». Den nærmeste forekomsten i «Kommende» kan krysses av tidlig.
 */
export default function ChildTodayScreen() {
  const { colors, personColor } = useTheme();
  const styles = useStyles();
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const me = useMyMember(householdId);
  const { session } = useSession();
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
  // Dra for å oppdatere, fokus og midnatt: også «Kommende» og «Gjort siste 3 dager».
  const hasMe = !!me;
  const refetch = useCallback(
    () =>
      Promise.all([
        refetchTasks(),
        refetchDone(),
        refetchUpcoming(),
        hasMe ? refetchRecentQuery() : undefined,
      ]),
    [refetchTasks, refetchDone, refetchUpcoming, refetchRecentQuery, hasMe],
  );
  const pullToRefresh = usePullToRefresh(refetch);
  const day = useMidnightRefetch(refetch);
  const balance = useBalance(householdId, me?.id ?? '');
  const complete = useCompleteTask(householdId);
  const undo = useUndoCompletion(householdId);
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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
  const nothingToDo = !isPending && !!me && sections.length === 0;
  const color = personColor(me?.avatar);
  // «3 av 7 · 35 kr tjent»
  const right =
    [progressText(mine.length, mineDone.length), earnedLabel(balance)].filter(Boolean).join(' · ') ||
    undefined;
  const busyId = complete.isPending ? complete.variables?.taskId : undefined;
  const recentDays = me ? groupRecentByDay(recent, me.id, today) : [];

  // Fra «I dag», «Ledige jobber» og sirkelen i «Kommende» (gjort før fristen).
  function markDone(task: Pick<Task, 'id' | 'title'>) {
    if (!me) return;
    setActionError(null);
    complete.mutate(
      { taskId: task.id, memberId: me.id },
      {
        onSuccess: (result) =>
          setToast({
            completionId: result.completionId,
            title: task.title,
            message: result.feedbackText,
            reward: result.rewardNok
              ? `+${formatKroner(result.rewardNok)}${result.pending ? ' – venter på godkjenning' : ''}`
              : undefined,
          }),
        onError: (e) => setActionError(toNorwegianMessage(e)),
      },
    );
  }

  // Trykk på en utført rad (innen 10 minutter, se DoneList): angre den.
  function undoDone(completion: TodayCompletion) {
    setActionError(null);
    undo.mutate(completion.id, {
      onSuccess: () => setToast((t) => (t?.completionId === completion.id ? null : t)),
      onError: (e) => setActionError(toNorwegianMessage(e)),
    });
  }

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

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl {...pullToRefresh} tintColor={colors.primary} />}
      >
        <PageHeader
          overline={formatWeekdayDate(today)}
          title={me ? `Hei, ${me.display_name}!` : 'I dag'}
          right={me ? <MemberAvatar member={me} size={48} ring={color.ring} /> : undefined}
        />

        <View style={styles.body}>
          {(error || actionError) && (
            <Text variant="metaStrong" color={colors.danger}>{actionError ?? toNorwegianMessage(error)}</Text>
          )}
          {nothingToDo && <EmptyState title="Ingenting å gjøre i dag 🎉" />}

          {me && (mine.length > 0 || mineDone.length > 0) && (
            <SectionCard title="Mine oppgaver i dag" color={color} right={right}>
              {mine.map((task) => (
                <TodayTaskRow
                  key={task.id}
                  task={task}
                  checkColor={color.ring}
                  busy={busyId === task.id}
                  onPress={() => markDone(task)}
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
              />
              <RecentDoneCard days={recentDays} checkColor={color.ring} />
            </>
          )}
        </View>
      </ScrollView>

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
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { ...pageWidth, paddingBottom: 120, gap: spacing.section },
    body: { paddingHorizontal: spacing.page, gap: spacing.section },
  }),
);
