import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, makeStyles, NoticeToast, SegmentedControl, Text } from '../../../src/ui';
import { useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { EverydayTasks } from '../../../src/features/tasks/components/EverydayTasks';
import { NewTaskSheet } from '../../../src/features/tasks/components/NewTaskSheet';
import type { TaskSection } from '../../../src/features/tasks/section';
import {
  FROM_TASKS,
  getTasksSegment,
  setTasksSegment,
  takeReveal,
  useTasksSegment,
} from '../../../src/features/tasks/tasksSegment';
import { YearWheel } from '../../../src/features/templates/components/YearWheel';

const SEGMENTS: { value: TaskSection; label: string }[] = [
  { value: 'everyday', label: 'Hverdag' },
  { value: 'year', label: 'Årshjul' },
];

const NOTICE: Record<TaskSection, string> = {
  everyday: 'Lagt i Hverdag',
  year: 'Lagt i Årshjul',
};

/**
 * «Oppgaver»: segmentene «Hverdag» (EverydayTasks) og «Årshjul» (YearWheel). Hvilket som er valgt,
 * huskes per enhet (tasksSegment.ts). /tasks?view=year velger Årshjul (de gamle lenkene til /year
 * sendes hit, se app/(app)/year.tsx).
 * Etter lagring i et skjema åpnet herfra (FROM_TASKS) byttes det til segmentet der oppgaven havnet.
 * I Årshjul rulles det til måneden én gang. Var det et annet segment, sier en kort melding nederst fra.
 */
export default function TasksScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const isAdult = useMyMember(householdId)?.role === 'adult';
  const segment = useTasksSegment();
  const [personId, setPersonId] = useState<string | null>(null);
  // «Ny oppgave» i Hverdag: velg «Oppgave» eller «Ekstrajobb».
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const [reveal, setReveal] = useState<{ sectionKey: string; id: number } | null>(null);

  // Lenke med ?view=year: velg Årshjul, og fjern parameteren så den ikke gjelder neste gang.
  const { view } = useLocalSearchParams<{ view?: string }>();
  useEffect(() => {
    if (view !== 'year') return;
    setTasksSegment('year');
    router.setParams({ view: undefined });
  }, [view]);

  // Tilbake fra et skjema: vis oppgaven der den havnet.
  useFocusEffect(
    useCallback(() => {
      const saved = takeReveal();
      if (!saved) return;
      if (saved.segment !== getTasksSegment()) setNotice({ id: saved.at, message: NOTICE[saved.segment] });
      setTasksSegment(saved.segment);
      if (saved.sectionKey) setReveal({ sectionKey: saved.sectionKey, id: saved.at });
    }, []),
  );

  /** Pluss i Hverdag: med en person valgt i filteret rett til skjemaet med personen forhåndsvalgt. */
  function create() {
    if (segment === 'year') router.push({ pathname: '/year-task/new', params: FROM_TASKS });
    else if (personId) router.push({ pathname: '/task/new', params: { memberId: personId, ...FROM_TASKS } });
    else setCreating(true);
  }

  // Bare voksne lager årsoppgaver, som før i Årshjul-fanen.
  const canAdd = segment === 'everyday' || isAdult;

  const header = (
    <View style={styles.top}>
      <View style={styles.titleRow}>
        <Text variant="screenTitle" accessibilityRole="header" style={styles.title}>Oppgaver</Text>
        {canAdd && (
          <IconButton
            icon="add"
            size={38}
            accessibilityLabel={segment === 'year' ? 'Ny årlig oppgave' : 'Ny oppgave'}
            onPress={create}
          />
        )}
      </View>
      <SegmentedControl options={SEGMENTS} value={segment} onChange={setTasksSegment} />
    </View>
  );

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {segment === 'everyday' ? (
        <EverydayTasks
          householdId={householdId}
          header={header}
          personId={personId}
          onPersonChange={setPersonId}
        />
      ) : (
        <YearWheel header={header} reveal={reveal} onRevealed={() => setReveal(null)} />
      )}
      <NewTaskSheet
        visible={creating}
        onClose={() => setCreating(false)}
        taskLabel="Oppgave"
        taskHref={{ pathname: '/task/new', params: FROM_TASKS }}
      />
      {notice && (
        <NoticeToast resetKey={String(notice.id)} message={notice.message} onHide={() => setNotice(null)} />
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    top: { gap: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
    title: { flex: 1 },
  }),
);
