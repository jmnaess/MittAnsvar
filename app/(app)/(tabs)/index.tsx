import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../src/components/Avatar';
import { colors } from '../../../src/components/theme';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { chooseCompletionAction } from '../../../src/features/completions/chooseDoer';
import { MemberPickerModal } from '../../../src/features/completions/components/MemberPickerModal';
import { useCompleteTask, useUndoCompletion } from '../../../src/features/completions/hooks';
import { FeedbackToast } from '../../../src/features/feedback/components/FeedbackToast';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { TodayTaskRow } from '../../../src/features/tasks/components/TodayTaskRow';
import { groupTodayByMember, JOBS_KEY, THIS_MONTH_KEY } from '../../../src/features/tasks/groupToday';
import { describeJobMembers } from '../../../src/features/tasks/job';
import { formatKroner } from '../../../src/features/tasks/reward';
import { useTodayTasks } from '../../../src/features/tasks/hooks';
import type { Member } from '../../../src/features/household/types';
import type { TodayTask } from '../../../src/features/tasks/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';

type Toast = { completionId: string; title: string; message: string | null; reward?: string };

/** «Hvem gjorde det?»: hvilke personer som kan velges, og om en er forhåndsvalgt. */
type Picking = { task: TodayTask; members: Member[]; preselectedId: string | null };

/**
 * «I dag»: forfalte oppgaver og dagens oppgaver, gruppert per medlem og felles.
 * Månedsoppgaver (f.eks. fra årshjulet) som ikke er forfalt, ligger under «Denne måneden», og
 * ledige jobber nederst under «Ledige jobber». Voksne legger ut jobber med «+» i headeren og
 * endrer dem med langt trykk.
 */
export default function TodayScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { session } = useSession();
  const { data: tasks, error, isPending, refetch } = useTodayTasks(householdId);
  const pullToRefresh = usePullToRefresh(refetch);
  const { data: members = [] } = useMembers(householdId);
  const complete = useCompleteTask(householdId);
  const undo = useUndoCompletion(householdId);

  const [toast, setToast] = useState<Toast | null>(null);
  const [picking, setPicking] = useState<Picking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Hent på nytt når fanen vises igjen: datoen kan ha skiftet, eller en annen voksen har krysset av.
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const me = members.find((m) => m.auth_user_id === session?.user.id);
  const isAdult = me?.role === 'adult';
  // Voksne ser alltid «Ledige jobber», så de vet hvor jobbene havner. Ikke før listen er hentet.
  const sections = groupTodayByMember(tasks ?? [], members, { showEmptyJobs: isAdult && !isPending });
  const nothingToDo = !isPending && sections.every((s) => s.data.length === 0);

  // «+» øverst til høyre åpner «Ny ledig jobb». Bare for voksne.
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAdult
        ? () => (
            <Pressable
              onPress={() => router.push('/job/new')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Ny ledig jobb"
              style={styles.addButton}
            >
              <Text style={styles.addText}>+</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, isAdult]);
  const nameOf = (memberId: string | null) => members.find((m) => m.id === memberId)?.display_name;

  function markDone(task: TodayTask, memberId: string) {
    setActionError(null);
    complete.mutate(
      { taskId: task.id, memberId },
      {
        onSuccess: (result) =>
          setToast({
            completionId: result.completionId,
            title: task.title,
            message: result.feedbackText,
            reward: result.rewardNok
              ? `+${formatKroner(result.rewardNok)} til ${nameOf(memberId) ?? 'barnet'}`
              : undefined,
          }),
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
    <View style={styles.flex}>
      <SectionList
        contentContainerStyle={styles.container}
        sections={sections}
        keyExtractor={(task) => task.id}
        {...pullToRefresh}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            {(error || actionError) && (
              <Text style={styles.error}>{actionError ?? toNorwegianMessage(error)}</Text>
            )}
            {/* I headeren, ikke ListEmptyComponent: for voksne er «Ledige jobber» alltid med. */}
            {nothingToDo && (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Ingenting å gjøre i dag 🎉</Text>
                <Text style={styles.emptyText}>Nye oppgaver lager du under «Oppgaver».</Text>
              </View>
            )}
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            {section.member && <Avatar avatar={section.member.avatar} size={28} />}
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.key === JOBS_KEY && section.data.length === 0 ? (
            <Text style={styles.emptyJobs}>Ingen ledige jobber. Trykk + for å legge ut en.</Text>
          ) : null
        }
        renderItem={({ item, section }) => (
          <TodayTaskRow
            task={item}
            assigneeName={
              section.key === THIS_MONTH_KEY
                ? (nameOf(item.assigned_member_id) ?? 'Felles')
                : section.key === JOBS_KEY
                  ? describeJobMembers(item.job_member_ids ?? [], members)
                  : undefined
            }
            busy={complete.isPending && complete.variables?.taskId === item.id}
            onPress={() => handlePress(item)}
            {...(isAdult && section.key === JOBS_KEY
              ? {
                  onLongPress: () =>
                    router.push({ pathname: '/job/[id]', params: { id: item.id } }),
                  longPressHint: 'Hold inne for å endre jobben',
                }
              : { onLongPress: () => setPicking({ task: item, members, preselectedId: null }) })}
          />
        )}
      />

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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  // Ekstra plass nederst, så banneret ikke dekker den siste oppgaven.
  container: { padding: 24, paddingBottom: 120 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  error: { color: colors.danger, fontSize: 15, marginBottom: 8 },
  empty: { alignItems: 'center', marginTop: 48, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: 15, color: colors.muted },
  emptyJobs: { fontSize: 15, color: colors.muted, paddingVertical: 8 },
  addButton: { paddingHorizontal: 16 },
  addText: { fontSize: 28, lineHeight: 32, color: colors.primary },
});
