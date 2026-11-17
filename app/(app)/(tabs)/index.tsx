import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../src/components/Avatar';
import { colors } from '../../../src/components/theme';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { MemberPickerModal } from '../../../src/features/completions/components/MemberPickerModal';
import { useCompleteTask, useUndoCompletion } from '../../../src/features/completions/hooks';
import { FeedbackToast } from '../../../src/features/feedback/components/FeedbackToast';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { TodayTaskRow } from '../../../src/features/tasks/components/TodayTaskRow';
import { groupTodayByMember } from '../../../src/features/tasks/groupToday';
import { useTodayTasks } from '../../../src/features/tasks/hooks';
import type { TodayTask } from '../../../src/features/tasks/types';
import { toNorwegianMessage } from '../../../src/lib/errors';

type Toast = { completionId: string; title: string; message: string | null };

/** «I dag»: forfalte oppgaver og dagens oppgaver, gruppert per medlem og felles. */
export default function TodayScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { session } = useSession();
  const { data: tasks, error, isPending, refetch, isRefetching } = useTodayTasks(householdId);
  const { data: members = [] } = useMembers(householdId);
  const complete = useCompleteTask(householdId);
  const undo = useUndoCompletion(householdId);

  const [toast, setToast] = useState<Toast | null>(null);
  const [picking, setPicking] = useState<TodayTask | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Hent på nytt når fanen vises igjen: datoen kan ha skiftet, eller en annen voksen har krysset av.
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const me = members.find((m) => m.auth_user_id === session?.user.id);
  const sections = groupTodayByMember(tasks ?? [], members);

  function markDone(task: TodayTask, memberId: string) {
    setActionError(null);
    complete.mutate(
      { taskId: task.id, memberId },
      {
        onSuccess: (result) =>
          setToast({ completionId: result.completionId, title: task.title, message: result.feedbackText }),
        onError: (e) => setActionError(toNorwegianMessage(e)),
      },
    );
  }

  // Ett trykk: den ansvarlige gjorde det. Felles oppgave: den som trykker.
  function handlePress(task: TodayTask) {
    const doer = task.assigned_member_id ?? me?.id;
    if (doer) markDone(task, doer);
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
        onRefresh={refetch}
        refreshing={isRefetching}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          error || actionError ? (
            <Text style={styles.error}>{actionError ?? toNorwegianMessage(error)}</Text>
          ) : undefined
        }
        ListEmptyComponent={
          isPending ? undefined : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Ingenting å gjøre i dag 🎉</Text>
              <Text style={styles.emptyText}>Nye oppgaver lager du under «Oppgaver».</Text>
            </View>
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            {section.member && <Avatar avatar={section.member.avatar} size={28} />}
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TodayTaskRow
            task={item}
            busy={complete.isPending && complete.variables?.taskId === item.id}
            onPress={() => handlePress(item)}
            onLongPress={() => setPicking(item)}
          />
        )}
      />

      <MemberPickerModal
        taskTitle={picking?.title ?? null}
        members={members}
        onClose={() => setPicking(null)}
        onPick={(member) => {
          if (picking) markDone(picking, member.id);
          setPicking(null);
        }}
      />

      {toast && (
        <FeedbackToast
          resetKey={toast.completionId}
          title={toast.title}
          message={toast.message}
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
});
