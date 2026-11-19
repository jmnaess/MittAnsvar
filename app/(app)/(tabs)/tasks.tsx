import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  EmptyState,
  FilterChips,
  GroupCard,
  GroupHeader,
  IconBadge,
  IconButton,
  makeStyles,
  Message,
  pageWidth,
  SearchField,
  SegmentedControl,
  spacing,
  SwipeToDelete,
  Text,
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
import { MemberPickerModal } from '../../../src/features/completions/components/MemberPickerModal';
import { NewTaskSheet } from '../../../src/features/tasks/components/NewTaskSheet';
import { TaskRow } from '../../../src/features/tasks/components/TaskRow';
import { useArchiveTask, useRestoreTask, useTasks } from '../../../src/features/tasks/hooks';
import { describeJobMembers, jobMembers } from '../../../src/features/tasks/job';
import { toggleGroup, useOpenGroups } from '../../../src/features/tasks/openGroups';
import { isJob } from '../../../src/features/tasks/recurrence';
import {
  bundleTasks,
  filterTasks,
  type GroupMode,
  groupByCategory,
  groupByPerson,
  joinNames,
  type OpenGroup,
  singleBundles,
  type TaskBundle,
  type TaskGroup,
  withOpenState,
} from '../../../src/features/tasks/taskGroups';
import type { Task } from '../../../src/features/tasks/types';
import { toIsoDate } from '../../../src/lib/dates';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';

const MODE_OPTIONS: { value: GroupMode; label: string }[] = [
  { value: 'category', label: 'Kategori' },
  { value: 'person', label: 'Person' },
];

// FilterChips trenger en verdi for «Alle». null kan ikke brukes som nøkkel.
const ALL = 'all';

type Group = TaskGroup<Task, Member>;
type Item = OpenGroup<Task, Member>;
type Bundle = TaskBundle<Task>;

/**
 * Alle aktive oppgaver, gruppert etter kategori eller person, med søk og personfilter.
 * Hver gruppe er ett kort med overskriften øverst og oppgavene inni når den er åpen.
 * Gruppene er lukket til de åpnes, og enheten husker hvilke som er åpne (openGroups.ts).
 * Mens man søker, er alle grupper med treff åpne.
 * Voksne kan dra en rad mot venstre og trykke «Slett». Oppgaven arkiveres med en gang, uten
 * bekreftelse, og banneret viser «Angre» i noen sekunder.
 * I Kategori-visningen er like oppgaver for flere personer én rad (bundleTasks). Trykk spør hvem
 * sin oppgave som skal endres, og sveip-slett sletter alle i raden. Person-visningen: én rad per oppgave.
 */
export default function TasksScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
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
  // Oppgavene i raden som ble slettet (flere når raden var sammenslått).
  const [deleted, setDeleted] = useState<Task[] | null>(null);
  // Sammenslått rad som ble trykket: velg hvem sin oppgave som skal endres.
  const [picking, setPicking] = useState<Task[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // «Ny oppgave»: velg «Oppgave» eller «Ledig jobb».
  const [creating, setCreating] = useState(false);

  const today = toIsoDate(new Date());
  const searching = query.trim() !== '';
  const filtered = filterTasks(tasks ?? [], { query, personId }, members);
  const groups: Group[] = mode === 'category' ? groupByCategory(filtered) : groupByPerson(filtered, members);
  const items = withOpenState(groups, openKeys, searching);

  /** Sletter alle oppgavene i raden. Banneret kan angre alle. */
  async function remove(rowTasks: Task[]) {
    setActionError(null);
    try {
      await Promise.all(rowTasks.map((t) => archive.mutateAsync(t.id)));
      setDeleted(rowTasks);
    } catch (e) {
      setActionError(toNorwegianMessage(e));
    }
  }

  async function undoRemove() {
    if (!deleted) return;
    try {
      await Promise.all(deleted.map((t) => restore.mutateAsync(t.id)));
    } catch (e) {
      setActionError(toNorwegianMessage(e));
    }
    setDeleted(null);
  }

  /** Radene i en gruppe: like oppgaver slås sammen bare i Kategori-visningen. */
  const rowsOf = (group: Group): Bundle[] =>
    group.kind === 'category' ? bundleTasks(group.tasks, members) : singleBundles(group.tasks);

  /** De ansvarlige, i medlemslistens rekkefølge (bundleTasks sorterer). */
  const assigneesOf = (rowTasks: Task[]) =>
    rowTasks
      .map((t) => members.find((m) => m.id === t.assigned_member_id))
      .filter((m): m is Member => m !== undefined);

  /** Avatarene på raden: barna som kan ta jobben, de ansvarlige, eller ingen (felles). */
  function peopleOf(rowTasks: Task[]) {
    const list = isJob(rowTasks[0]) ? jobMembers(rowTasks[0].job_member_ids, members) : assigneesOf(rowTasks);
    return list.map((m) => ({ avatar: m.avatar, photo: photoOf(m) }));
  }

  function nameOf(rowTasks: Task[]) {
    if (isJob(rowTasks[0])) return describeJobMembers(rowTasks[0].job_member_ids, members);
    const names = assigneesOf(rowTasks).map((m) => m.display_name);
    return names.length > 0 ? joinNames(names) : 'Felles';
  }

  // Jobber endres i jobbskjemaet, alt annet i oppgaveskjemaet.
  const edit = (task: Task) =>
    router.push({ pathname: isJob(task) ? '/job/[id]' : '/task/[id]', params: { id: task.id } });

  function pickOwner(member: Member) {
    const task = picking?.find((t) => t.assigned_member_id === member.id);
    setPicking(null);
    if (task) edit(task);
  }

  /** Pluss øverst: med en person valgt i filteret rett til skjemaet med personen forhåndsvalgt. */
  function create() {
    if (personId) router.push({ pathname: '/task/new', params: { memberId: personId } });
    else setCreating(true);
  }

  function renderItem({ item }: { item: Item }) {
    const rows = rowsOf(item.group);
    return (
      <GroupCard
        header={
          <GroupHeaderFor
            group={item.group}
            count={rows.length}
            open={item.open}
            // Under søk er alle åpne. Da lagres ikke noe ved trykk.
            onPress={() => !searching && toggleGroup(item.group.key)}
            photoOf={photoOf}
          />
        }
      >
        {item.open && rows.map(renderRow)}
      </GroupCard>
    );
  }

  function renderRow(bundle: Bundle) {
    const rowTasks = bundle.tasks;
    const row = (
      <TaskRow
        tasks={rowTasks}
        people={peopleOf(rowTasks)}
        assigneeName={nameOf(rowTasks)}
        today={today}
        showCategory={mode === 'person'}
        onPress={() => (rowTasks.length > 1 ? setPicking(rowTasks) : edit(rowTasks[0]))}
      />
    );
    return isAdult ? (
      <SwipeToDelete key={bundle.key} onDelete={() => remove(rowTasks)}>{row}</SwipeToDelete>
    ) : (
      <View key={bundle.key}>{row}</View>
    );
  }

  const hasTasks = (tasks?.length ?? 0) > 0;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
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
            <View style={styles.top}>
              <Text variant="screenTitle" accessibilityRole="header" style={styles.title}>Oppgaver</Text>
              <IconButton icon="add" size={38} accessibilityLabel="Ny oppgave" onPress={create} />
            </View>
            {(error || actionError) && <Message>{actionError ?? toNorwegianMessage(error)}</Message>}
            {hasTasks && (
              <>
                <SearchField value={query} onChangeText={setQuery} placeholder="Søk i oppgaver" />
                <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
                {members.length > 1 && (
                  <FilterChips
                    options={[
                      { value: ALL, label: 'Alle' },
                      ...members.map((m) => ({
                        value: m.id,
                        label: m.display_name,
                        left: <Avatar avatar={m.avatar} photo={photoOf(m)} size={20} />,
                      })),
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
            <EmptyState title="Ingen oppgaver ennå" text="Trykk + for å lage den første." />
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
      <MemberPickerModal
        taskTitle={picking?.[0].title ?? null}
        title="Hvem sin oppgave vil du endre?"
        members={picking ? assigneesOf(picking) : []}
        onPick={pickOwner}
        onClose={() => setPicking(null)}
      />
      {deleted && (
        <UndoToast
          resetKey={deleted[0].id}
          message={`Slettet: ${deleted[0].title}${deleted.length > 1 ? ` (${deleted.length})` : ''}`}
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
  /** Antall rader i gruppen (sammenslåtte oppgaver teller som én). */
  count: number;
  open: boolean;
  onPress: () => void;
  photoOf: ReturnType<typeof useMemberPhotoLookup>;
};

/** Overskriften med riktig ikon: kategoriikon i firkant, personens avatar, eller nøytral rund for «Felles» og «Ledige jobber». */
function GroupHeaderFor({ group, count, open, onPress, photoOf }: GroupHeaderProps) {
  const { colors } = useTheme();
  switch (group.kind) {
    case 'category':
      return (
        <GroupHeader
          title={group.category.label}
          count={count}
          open={open}
          onPress={onPress}
          left={
            <IconBadge
              icon={group.category.icon}
              size={34}
              shape="square"
              background={colors.iconTint}
              color={colors.primary}
            />
          }
        />
      );
    case 'member':
      return (
        <GroupHeader
          title={group.member.display_name}
          count={count}
          open={open}
          onPress={onPress}
          left={<Avatar avatar={group.member.avatar} photo={photoOf(group.member)} size={34} />}
        />
      );
    case 'shared':
      return (
        <GroupHeader
          title="Felles"
          count={count}
          open={open}
          onPress={onPress}
          left={<IconBadge icon="people" size={34} background={colors.surfaceMuted} color={colors.textMuted} />}
        />
      );
    case 'jobs':
      return (
        <GroupHeader
          title="Ledige jobber"
          count={count}
          open={open}
          onPress={onPress}
          left={<IconBadge icon="briefcase-outline" size={34} background={colors.surfaceMuted} color={colors.textMuted} />}
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
    header: { gap: 12, marginBottom: spacing.row + 4 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
    title: { flex: 1 },
    separator: { height: spacing.row },
  }),
);
