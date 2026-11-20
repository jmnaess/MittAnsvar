import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AddFab, makeStyles, NoticeToast, SegmentedControl } from '../../../src/ui';
import { useMyHousehold, useMyMember } from '../../../src/features/household/hooks';
import { EverydayTasks } from '../../../src/features/tasks/components/EverydayTasks';
import { tasksAddButton } from '../../../src/features/tasks/addMenu';
import type { TaskSection } from '../../../src/features/tasks/section';
import {
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
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const isAdult = useMyMember(householdId)?.role === 'adult';
  const segment = useTasksSegment();
  const [personId, setPersonId] = useState<string | null>(null);
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

  // Knapp med tekst nede til høyre (bare voksne), uten meny: «Ny oppgave» i Hverdag (med personen
  // fra filteret) og «Ny årshjul-oppgave» i Årshjul. Teksten følger segmentet.
  const addButton = tasksAddButton({ segment, isAdult, memberId: personId });
  const hasFab = addButton !== null;

  // Tittel og avatar står i navigasjonsheaderen (app/(app)/(tabs)/_layout.tsx). Segmentene ruller med listen.
  const header = <SegmentedControl options={SEGMENTS} value={segment} onChange={setTasksSegment} />;

  return (
    <View style={styles.flex}>
      {segment === 'everyday' ? (
        <EverydayTasks
          householdId={householdId}
          header={header}
          personId={personId}
          onPersonChange={setPersonId}
          aboveFab={hasFab}
        />
      ) : (
        <YearWheel header={header} reveal={reveal} onRevealed={() => setReveal(null)} />
      )}
      {addButton && <AddFab label={addButton.label} onPress={() => router.push(addButton.href)} />}
      {notice && (
        <NoticeToast
          resetKey={String(notice.id)}
          message={notice.message}
          onHide={() => setNotice(null)}
          aboveFab={hasFab}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
  }),
);
