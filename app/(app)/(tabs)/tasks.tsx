import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  ChoiceChips,
  EmptyState,
  GroupHeader,
  IconBadge,
  makeStyles,
  Message,
  pageWidth,
  SearchField,
  spacing,
  SwipeToDelete,
  UndoToast,
  useTheme,
} from '../../../src/ui';
import {
  useMemberPhotoLookup,
  useMembers,
  useMyHousehold,
  useMyMember,
} from '../../../src/features/household/hooks';
import type { Member } from '../../../src/features/household/types';
import { NewTaskSheet } from '../../../src/features/tasks/components/NewTaskSheet';
import { TaskRow } from '../../../src/features/tasks/components/TaskRow';
import { useArchiveTask, useRestoreTask, useTasks } from '../../../src/features/tasks/hooks';
import { describeJobMembers, jobMembers } from '../../../src/features/tasks/job';
import { toggleGroup, useOpenGroups } from '../../../src/features/tasks/openGroups';
import { isJob } from '../../../src/features/tasks/recurrence';
import {
  filterTasks,
  type GroupMode,
  groupByCategory,
  groupByPerson,
  type TaskGroup,
  type TaskListItem,
  toListItems,
} from '../../../src/features/tasks/taskGroups';
import type { Task } from '../../../src/features/tasks/types';
import { toIsoDate } from '../../../src/lib/dates';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';

const MODE_OPTIONS: { value: GroupMode; label: string }[] = [
  { value: 'category', label: 'Kategori' },
  { value: 'person', label: 'Person' },
];

// ChoiceChips trenger en verdi for «Alle». null kan ikke brukes som nøkkel.
const ALL = 'all';

type Group = TaskGroup<Task, Member>;
type Item = TaskListItem<Task, Member>;

/**
 * Alle aktive oppgaver, gruppert etter kategori eller person, med søk og personfilter.
 * Gruppene er lukket til de åpnes, og enheten husker hvilke som er åpne (openGroups.ts).
 * Mens man søker, er alle grupper med treff åpne.
 * Voksne kan dra en rad mot venstre og trykke «Slett». Oppgaven arkiveres med en gang, uten
 * bekreftelse, og banneret viser «Angre» i noen sekunder.
 */
export default function TasksScreen() {
  const styles = useStyles();
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const { data: tasks, error, isPending, refetch } = useTasks(household!.id);
  const pullToRefresh = usePullToRefresh(refetch);
  const { data: members = [] } = useMembers(household!.id);
  const photoOf = useMemberPhotoLookup(household!.id);
  const isAdult = useMyMember(household!.id)?.role === 'adult';
  const archive = useArchiveTask(household!.id);
  const restore = useRestoreTask(household!.id);
  const openKeys = useOpenGroups();
  const [mode, setMode] = useState<GroupMode>('category');
  const [personId, setPersonId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [deleted, setDeleted] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // «Ny oppgave»: velg «Oppgave» eller «Ledig jobb».
  const [creating, setCreating] = useState(false);

  const today = toIsoDate(new Date());
  const searching = query.trim() !== '';
  const filtered = filterTasks(tasks ?? [], { query, personId }, members);
  const groups: Group[] = mode === 'category' ? groupByCategory(filtered) : groupByPerson(filtered, members);
  const items = toListItems(groups, openKeys, searching);

  function remove(task: Task) {
    setActionError(null);
    archive.mutate(task.id, {
      onSuccess: () => setDeleted(task),
      onError: (e) => setActionError(toNorwegianMessage(e)),
    });
  }

  function undoRemove() {
    if (!deleted) return;
    restore.mutate(deleted.id, {
      onSuccess: () => setDeleted(null),
      onError: (e) => {
        setDeleted(null);
        setActionError(toNorwegianMessage(e));
      },
    });
  }

  /** Avatarene på raden: barna som kan ta jobben, den ansvarlige, eller ingen (felles). */
  function peopleOf(task: Task) {
    const list = isJob(task)
      ? jobMembers(task.job_member_ids, members)
      : members.filter((m) => m.id === task.assigned_member_id);
    return list.map((m) => ({ avatar: m.avatar, photo: photoOf(m) }));
  }

  const nameOf = (task: Task) =>
    isJob(task)
      ? describeJobMembers(task.job_member_ids, members)
      : (members.find((m) => m.id === task.assigned_member_id)?.display_name ?? 'Felles');

  function renderItem({ item }: { item: Item }) {
    if (item.type === 'header') {
      return (
        <GroupHeaderFor
          group={item.group}
          open={item.open}
          // Under søk er alle åpne. Da lagres ikke noe ved trykk.
          onPress={() => !searching && toggleGroup(item.group.key)}
          photoOf={photoOf}
        />
      );
    }
    const task = item.task;
    const row = (
      <TaskRow
        task={task}
        people={peopleOf(task)}
        assigneeName={nameOf(task)}
        today={today}
        showCategory={mode === 'person'}
        // Jobber endres i jobbskjemaet, alt annet i oppgaveskjemaet.
        onPress={() =>
          router.push({ pathname: isJob(task) ? '/job/[id]' : '/task/[id]', params: { id: task.id } })
        }
      />
    );
    return isAdult ? <SwipeToDelete onDelete={() => remove(task)}>{row}</SwipeToDelete> : row;
  }

  const hasTasks = (tasks?.length ?? 0) > 0;

  return (
    <View style={styles.flex}>
      <FlatList
        contentContainerStyle={styles.container}
        data={items}
        keyExtractor={(item) => item.key}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        {...pullToRefresh}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button title="Ny oppgave" onPress={() => setCreating(true)} />
            {(error || actionError) && <Message>{actionError ?? toNorwegianMessage(error)}</Message>}
            {hasTasks && (
              <>
                <SearchField value={query} onChangeText={setQuery} placeholder="Søk i oppgavene" />
                <ChoiceChips options={MODE_OPTIONS} value={mode} onChange={setMode} />
                {members.length > 1 && (
                  <ChoiceChips
                    options={[
                      { value: ALL, label: 'Alle' },
                      ...members.map((m) => ({ value: m.id, label: m.display_name })),
                    ]}
                    value={personId ?? ALL}
                    onChange={(id) => setPersonId(id === ALL ? null : id)}
                  />
                )}
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? undefined : hasTasks ? (
            <EmptyState title="Ingen treff" text="Prøv et annet søk, eller velg Alle." />
          ) : (
            <EmptyState title="Ingen oppgaver ennå" text="Trykk «Ny oppgave» for å lage den første." />
          )
        }
        renderItem={renderItem}
      />
      <NewTaskSheet
        visible={creating}
        onClose={() => setCreating(false)}
        taskLabel="Oppgave"
        taskHref="/task/new"
      />
      {deleted && (
        <UndoToast
          resetKey={deleted.id}
          message={`Slettet: ${deleted.title}`}
          undoing={restore.isPending}
          onUndo={undoRemove}
          onHide={() => setDeleted(null)}
        />
      )}
    </View>
  );
}

type GroupHeaderProps = {
  group: Group;
  open: boolean;
  onPress: () => void;
  photoOf: ReturnType<typeof useMemberPhotoLookup>;
};

/** Overskriften med riktig ikon: kategoriikon, personens avatar, «Felles» eller «Ledige jobber». */
function GroupHeaderFor({ group, open, onPress, photoOf }: GroupHeaderProps) {
  const { colors, sharedColors } = useTheme();
  const count = group.tasks.length;
  switch (group.kind) {
    case 'category':
      return (
        <GroupHeader
          title={group.category.label}
          count={count}
          open={open}
          onPress={onPress}
          left={<IconBadge icon={group.category.icon} />}
        />
      );
    case 'member':
      return (
        <GroupHeader
          title={group.member.display_name}
          count={count}
          open={open}
          onPress={onPress}
          left={<Avatar avatar={group.member.avatar} photo={photoOf(group.member)} size={36} />}
        />
      );
    case 'shared':
      return (
        <GroupHeader
          title="Felles"
          count={count}
          open={open}
          onPress={onPress}
          left={<IconBadge icon="people" background={sharedColors.tint} color={sharedColors.ink} />}
        />
      );
    case 'jobs':
      return (
        <GroupHeader
          title="Ledige jobber"
          count={count}
          open={open}
          onPress={onPress}
          left={<IconBadge icon="briefcase-outline" background={colors.jobBg} color={colors.jobAmount} />}
        />
      );
  }
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    // Ekstra plass nederst, så banneret ikke dekker den siste oppgaven.
    container: { ...pageWidth, padding: spacing.page, paddingBottom: 120 },
    header: { gap: 12, marginBottom: spacing.section },
    separator: { height: spacing.row },
  }),
);
