import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../src/components/theme';
import { useCompleteTask, useUndoCompletion } from '../../../src/features/completions/hooks';
import { FeedbackToast } from '../../../src/features/feedback/components/FeedbackToast';
import { useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { childTodaySections } from '../../../src/features/tasks/childToday';
import { TodayTaskRow } from '../../../src/features/tasks/components/TodayTaskRow';
import { JOBS_KEY } from '../../../src/features/tasks/groupToday';
import { useTodayTasks } from '../../../src/features/tasks/hooks';
import { formatKroner } from '../../../src/features/tasks/reward';
import type { TodayTask } from '../../../src/features/tasks/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';

type Toast = { completionId: string; title: string; message: string | null; reward?: string };

/**
 * «I dag» på barnets egen enhet: «Mine oppgaver i dag» og «Ledige jobber».
 * Barnet krysser alltid av for seg selv, med ett trykk. Langt trykk gjør ingenting.
 */
export default function ChildTodayScreen() {
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const me = useMyMember(householdId);
  const { data: tasks, error, isPending, refetch } = useTodayTasks(householdId);
  const pullToRefresh = usePullToRefresh(refetch);
  const complete = useCompleteTask(householdId);
  const undo = useUndoCompletion(householdId);
  const [toast, setToast] = useState<Toast | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Hent på nytt når fanen vises: en voksen kan ha lagt ut en ny jobb.
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const sections = me ? childTodaySections(tasks ?? [], me.id) : [];
  const nothingToDo = !isPending && !!me && sections.length === 0;

  function markDone(task: TodayTask) {
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
            reward: result.rewardNok ? `+${formatKroner(result.rewardNok)}` : undefined,
          }),
        onError: (e) => setActionError(toNorwegianMessage(e)),
      },
    );
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
            {me && <Text style={styles.hello}>Hei, {me.display_name}!</Text>}
            {(error || actionError) && (
              <Text style={styles.error}>{actionError ?? toNorwegianMessage(error)}</Text>
            )}
            {nothingToDo && (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Ingenting å gjøre i dag 🎉</Text>
              </View>
            )}
          </>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item, section }) => (
          <TodayTaskRow
            task={item}
            assigneeName={section.key === JOBS_KEY ? 'Ledig jobb' : undefined}
            busy={complete.isPending && complete.variables?.taskId === item.id}
            onPress={() => markDone(item)}
          />
        )}
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
  container: { padding: 24, paddingBottom: 120 },
  hello: { fontSize: 22, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 4 },
  error: { color: colors.danger, fontSize: 15, marginTop: 8 },
  empty: { alignItems: 'center', marginTop: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
});
