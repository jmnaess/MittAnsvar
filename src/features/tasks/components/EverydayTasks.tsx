import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Avatar,
  EmptyState,
  FilterChips,
  GroupCard,
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
} from '../../../ui';
import { toIsoDate } from '../../../lib/dates';
import { toNorwegianMessage } from '../../../lib/errors';
import { usePullToRefresh } from '../../../lib/usePullToRefresh';
import { MemberPickerModal } from '../../completions/components/MemberPickerModal';
import { useMemberPhotoLookup, useMembers, useMyMember } from '../../household/hooks';
import type { Member } from '../../household/types';
import { useArchiveTask, useRestoreTask, useTasks } from '../hooks';
import { describeJobMembers, jobMembers } from '../job';
import { toggleGroup, useOpenGroups } from '../openGroups';
import { isJob } from '../recurrence';
import { taskSection } from '../section';
import { FROM_TASKS } from '../tasksSegment';
import {
  bundleTasks,
  filterTasks,
  groupByCategory,
  joinNames,
  type OpenGroup,
  type TaskBundle,
  withOpenState,
} from '../taskGroups';
import type { Task } from '../types';
import { TaskRow } from './TaskRow';

// FilterChips trenger en verdi for «Alle». null kan ikke brukes som nøkkel.
const ALL = 'all';

type Item = OpenGroup<Task>;
type Bundle = TaskBundle<Task>;

type Props = {
  householdId: string;
  /** Toppen av fanen (tittel, pluss og segmentene). Ruller med listen. */
  header: ReactElement;
  /** Personfilteret. null = Alle. Pluss øverst bruker det for å forhåndsvelge personen. */
  personId: string | null;
  onPersonChange: (id: string | null) => void;
};

/**
 * «Hverdag» i «Oppgaver»: oppgavene der taskSection er 'everyday', gruppert etter kategori, med søk
 * og personfilter. Hver gruppe er ett kort med overskriften øverst og oppgavene inni når den er åpen.
 * Gruppene er lukket til de åpnes, og enheten husker hvilke som er åpne (openGroups.ts).
 * Mens man søker, er alle grupper med treff åpne.
 * Voksne kan dra en rad mot venstre og trykke «Slett». Oppgaven arkiveres med en gang, uten
 * bekreftelse, og banneret viser «Angre» i noen sekunder.
 * Like oppgaver for flere personer er én rad (bundleTasks). Trykk spør hvem sin oppgave som skal
 * endres, og sveip-slett sletter alle i raden.
 */
export function EverydayTasks({ householdId, header, personId, onPersonChange }: Props) {
  const styles = useStyles();
  const { data: allTasks, error, isPending, refetch } = useTasks(householdId);
  const pullToRefresh = usePullToRefresh(refetch);
  const { data: members = [] } = useMembers(householdId);
  const photoOf = useMemberPhotoLookup(householdId);
  const isAdult = useMyMember(householdId)?.role === 'adult';
  const archive = useArchiveTask(householdId);
  const restore = useRestoreTask(householdId);
  const openKeys = useOpenGroups();
  const [query, setQuery] = useState('');
  // Oppgavene i raden som ble slettet (flere når raden var sammenslått).
  const [deleted, setDeleted] = useState<Task[] | null>(null);
  // Sammenslått rad som ble trykket: velg hvem sin oppgave som skal endres.
  const [picking, setPicking] = useState<Task[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const today = toIsoDate(new Date());
  const searching = query.trim() !== '';
  const tasks = (allTasks ?? []).filter((t) => taskSection(t) === 'everyday');
  const filtered = filterTasks(tasks, { query, personId }, members);
  const items = withOpenState(groupByCategory(filtered), openKeys, searching);

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

  // Jobber endres i jobbskjemaet (de står alltid i Hverdag), alt annet i oppgaveskjemaet.
  const edit = (task: Task) =>
    isJob(task)
      ? router.push({ pathname: '/job/[id]', params: { id: task.id } })
      : router.push({ pathname: '/task/[id]', params: { id: task.id, ...FROM_TASKS } });

  function pickOwner(member: Member) {
    const task = picking?.find((t) => t.assigned_member_id === member.id);
    setPicking(null);
    if (task) edit(task);
  }

  function renderItem({ item }: { item: Item }) {
    const rows = bundleTasks(item.group.tasks, members);
    return (
      <GroupCard
        header={
          <CategoryHeader
            item={item}
            count={rows.length}
            // Under søk er alle åpne. Da lagres ikke noe ved trykk.
            onPress={() => !searching && toggleGroup(item.group.key)}
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
        onPress={() => (rowTasks.length > 1 ? setPicking(rowTasks) : edit(rowTasks[0]))}
      />
    );
    return isAdult ? (
      <SwipeToDelete key={bundle.key} onDelete={() => remove(rowTasks)}>{row}</SwipeToDelete>
    ) : (
      <View key={bundle.key}>{row}</View>
    );
  }

  const hasTasks = tasks.length > 0;
  // Husstanden har oppgaver, men alle står i Årshjul.
  const onlyYearly = !hasTasks && (allTasks?.length ?? 0) > 0;

  return (
    <>
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
            {header}
            {(error || actionError) && <Message>{actionError ?? toNorwegianMessage(error)}</Message>}
            {hasTasks && (
              <>
                <SearchField value={query} onChangeText={setQuery} placeholder="Søk i oppgaver" />
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
                    onChange={(id) => onPersonChange(id === ALL ? null : id)}
                  />
                )}
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? undefined : hasTasks ? (
            <EmptyState title="Ingen treff" text="Prøv et annet søk, eller velg Alle." />
          ) : onlyYearly ? (
            <EmptyState
              title="Ingen hverdagsoppgaver ennå"
              text="Oppgavene dere har, står i Årshjul. Trykk + for å lage en hverdagsoppgave."
            />
          ) : (
            <EmptyState title="Ingen oppgaver ennå" text="Trykk + for å lage den første." />
          )
        }
        renderItem={renderItem}
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
    </>
  );
}

type CategoryHeaderProps = {
  item: Item;
  /** Antall rader i gruppen (sammenslåtte oppgaver teller som én). */
  count: number;
  onPress: () => void;
};

/** Overskriften på et kategorikort: kategoriikon i firkant, navn og antall. */
function CategoryHeader({ item, count, onPress }: CategoryHeaderProps) {
  const { colors } = useTheme();
  const { category } = item.group;
  return (
    <GroupHeader
      title={category.label}
      count={count}
      open={item.open}
      onPress={onPress}
      left={
        <IconBadge icon={category.icon} size={34} shape="square" background={colors.iconTint} color={colors.primary} />
      }
    />
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    // Ekstra plass nederst, så banneret ikke dekker den siste oppgaven.
    container: { ...pageWidth, padding: spacing.page, paddingBottom: 120 },
    header: { gap: 12, marginBottom: spacing.row + 4 },
    separator: { height: spacing.row },
  }),
);
