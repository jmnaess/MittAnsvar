import { router } from 'expo-router';
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, SectionList, StyleSheet, View } from 'react-native';
import { Button, makeStyles, Message, pageWidth, spacing, Text, useTheme } from '../../../ui';
import { toIsoDate } from '../../../lib/dates';
import { toNorwegianMessage } from '../../../lib/errors';
import { usePullToRefresh } from '../../../lib/usePullToRefresh';
import { hasAnyAnswer } from '../../household/homeProfile';
import { useMembers, useMyHousehold, useMyMember } from '../../household/hooks';
import { useArchiveTask, useTasks } from '../../tasks/hooks';
import { FROM_TASKS } from '../../tasks/tasksSegment';
import type { Task } from '../../tasks/types';
import { useActivateTemplates, useTemplates } from '../hooks';
import {
  activeTemplateIds,
  describeEvery,
  groupByMonth,
  INTERVAL_SECTION_KEY,
  type MonthSection,
  type YearItem,
  yearWheelTemplates,
} from '../suggest';
import type { TaskTemplate } from '../types';
import { OwnYearTaskRow } from './OwnYearTaskRow';
import { TemplateRow } from './TemplateRow';

type Props = {
  /** Toppen av fanen (tittel, pluss og segmentene). Ruller med listen. */
  header: ReactElement;
  /** Seksjonen som skal rulles fram (etter lagring). id endres for hver ny lagring. */
  reveal: { sectionKey: string; id: number } | null;
  /** Kalles når rullingen er startet, så den ikke gjentas neste gang Årshjul vises. */
  onRevealed: () => void;
};

/** Så mange ganger prøver listen på nytt når den ikke kommer fram til seksjonen. */
const MAX_SCROLL_RETRIES = 3;

/**
 * «Årshjul» i «Oppgaver»: januar til desember, så «Med jevne mellomrom» (lange intervaller).
 * Hver seksjon viser malene som passer husstanden, med en bryter for å aktivere (lage oppgave) eller
 * deaktivere (arkivere den), og husstandens egne oppgaver, merket «Egen». Voksne kan trykke på en egen
 * oppgave eller en mal som er på, for å endre oppgaven. Voksne lager nye med «+» øverst.
 */
export function YearWheel({ header, reveal, onRevealed }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { data: members = [] } = useMembers(householdId);
  const isAdult = useMyMember(householdId)?.role === 'adult';
  const templates = useTemplates();
  const tasks = useTasks(householdId);
  const activate = useActivateTemplates(householdId);
  const archive = useArchiveTask(householdId);

  // Bryterens verdi mens en endring lagres, så den ikke hopper tilbake før listen er hentet på nytt.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const today = toIsoDate(new Date());
  const suggested = yearWheelTemplates(
    templates.data ?? [],
    household!,
    activeTemplateIds(tasks.data ?? []),
  );
  const sections = groupByMonth(suggested, tasks.data ?? []);
  const nameOf = (memberId: string | null) =>
    members.find((m) => m.id === memberId)?.display_name ?? 'Felles';

  const taskByTemplate = new Map<string, Task>();
  for (const t of tasks.data ?? []) if (t.template_id) taskByTemplate.set(t.template_id, t);
  const notActive = suggested.filter((t) => !taskByTemplate.has(t.id));

  // Rull til seksjonen der en lagret oppgave havnet, når listen er hentet. Én gang per lagring:
  // onRevealed tømmer reveal, så det ikke rulles på nytt når segmentet byttes fram og tilbake.
  const listRef = useRef<SectionList<YearItem, MonthSection>>(null);
  const targetIndex = useRef(-1);
  const retries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = !tasks.isPending && !templates.isPending;
  const revealIndex = reveal ? sections.findIndex((s) => s.key === reveal.sectionKey) : -1;

  function scrollToTarget(delayMs: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (targetIndex.current < 0) return;
      listRef.current?.scrollToLocation({ sectionIndex: targetIndex.current, itemIndex: 0, viewOffset: 8 });
    }, delayMs);
  }

  // Ingen tidtaker skal gå etter at Årshjul er lukket.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!loaded || revealIndex < 0) return;
    targetIndex.current = revealIndex;
    retries.current = 0;
    // Vent til listen er tegnet med de nye radene.
    scrollToTarget(100);
    onRevealed();
    // Bare når en ny lagring skal vises, ikke ved hver oppdatering av listen.
  }, [reveal?.id, loaded]);

  function setPendingFor(ids: string[], value: boolean | null) {
    setPending((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (value === null) delete next[id];
        else next[id] = value;
      }
      return next;
    });
  }

  function activateMany(ids: string[]) {
    setActionError(null);
    setPendingFor(ids, true);
    activate.mutate(ids, {
      onError: (e) => setActionError(toNorwegianMessage(e)),
      onSettled: () => setPendingFor(ids, null),
    });
  }

  function toggle(template: TaskTemplate, on: boolean) {
    if (on) return activateMany([template.id]);

    const task = taskByTemplate.get(template.id);
    if (!task) return;
    setActionError(null);
    setPendingFor([template.id], false);
    archive.mutate(task.id, {
      onError: (e) => setActionError(toNorwegianMessage(e)),
      onSettled: () => setPendingFor([template.id], null),
    });
  }

  function checkAll() {
    const ids = notActive.map((t) => t.id);
    Alert.alert(
      'Huke av alle?',
      `${ids.length} ${ids.length === 1 ? 'oppgave' : 'oppgaver'} legges til i årshjulet. Du kan slå av enkeltoppgaver etterpå.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Legg til', onPress: () => activateMany(ids) },
      ],
    );
  }

  const loadError = templates.error ?? tasks.error;
  const refetchTemplates = templates.refetch;
  const refetchTasks = tasks.refetch;
  const pullToRefresh = usePullToRefresh(
    useCallback(() => Promise.all([refetchTemplates(), refetchTasks()]), [refetchTemplates, refetchTasks]),
  );

  return (
    <SectionList
      ref={listRef}
      contentContainerStyle={styles.container}
      sections={sections}
      keyExtractor={(item) => item.key}
      stickySectionHeadersEnabled={false}
      {...pullToRefresh}
      // Uten faste høyder kan listen ikke alltid rulle rett til en seksjon langt nede.
      // Rull omtrent dit først, og prøv igjen når radene der er tegnet.
      onScrollToIndexFailed={(info) => {
        if (retries.current >= MAX_SCROLL_RETRIES) return;
        retries.current += 1;
        listRef.current?.getScrollResponder()?.scrollTo({ y: info.averageItemLength * info.index, animated: false });
        scrollToTarget(100);
      }}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          <Text variant="meta" color={colors.textMuted}>
            Faste oppgaver gjennom året. Slå på det som passer, eller lag egne med +. Oppgaver
            med måned dukker opp under «Denne måneden» i «I dag» når måneden kommer. De med jevne
            mellomrom kommer i «I dag» når det er på tide igjen.
          </Text>
          {isAdult && notActive.length > 0 && (
            <Button
              title="Huk av alle"
              variant="secondary"
              onPress={checkAll}
              disabled={activate.isPending}
            />
          )}
          {isAdult && !hasAnyAnswer(household!) && (
            <Button
              title="Fortell om hjemmet for flere forslag"
              variant="text"
              onPress={() => router.push('/home-profile')}
            />
          )}
          {!isAdult && members.length > 0 && (
            <Message tone="muted">Bare voksne kan endre årshjulet.</Message>
          )}
          {(loadError || actionError) && <Message>{actionError ?? toNorwegianMessage(loadError)}</Message>}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text variant="sectionTitle" accessibilityRole="header" style={styles.month}>{section.title}</Text>
      )}
      ItemSeparatorComponent={Separator}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 && !templates.isPending ? (
          <Message tone="muted">
            {section.key === INTERVAL_SECTION_KEY ? 'Ingen oppgaver med jevne mellomrom.' : 'Ingenting denne måneden.'}
          </Message>
        ) : null
      }
      renderItem={({ item, section }) => {
        const inIntervals = section.key === INTERVAL_SECTION_KEY;
        if (item.kind === 'own') {
          return (
            <OwnYearTaskRow
              task={item.task}
              assigneeName={nameOf(item.task.assigned_member_id)}
              when={inIntervals ? describeEvery(item.task, item.task.next_due_on, today) : undefined}
              onPress={
                isAdult
                  ? () => router.push({ pathname: '/task/[id]', params: { id: item.task.id, ...FROM_TASKS } })
                  : undefined
              }
            />
          );
        }
        const template = item.template;
        const task = taskByTemplate.get(template.id) ?? null;
        const isPending = template.id in pending;
        return (
          <TemplateRow
            template={template}
            task={task}
            value={isPending ? pending[template.id] : task !== null}
            disabled={!isAdult || isPending}
            onToggle={(on) => toggle(template, on)}
            when={inIntervals ? describeEvery(template, task?.next_due_on ?? null, today) : undefined}
            // En mal som er på, er en vanlig oppgave: voksne kan endre ansvarlig, lønn og frist.
            onPress={
              isAdult && task
                ? () => router.push({ pathname: '/task/[id]', params: { id: task.id, ...FROM_TASKS } })
                : undefined
            }
          />
        );
      }}
    />
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    container: { ...pageWidth, padding: spacing.page, paddingBottom: 120 },
    header: { gap: 12 },
    month: { marginTop: spacing.section + 6, marginBottom: spacing.row },
    separator: { height: spacing.row },
  }),
);
