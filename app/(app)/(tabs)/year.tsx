import { router, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, SectionList, StyleSheet, View } from 'react-native';
import { Button, colors, IconButton, Message, spacing, Text } from '../../../src/ui';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { hasAnyAnswer } from '../../../src/features/household/homeProfile';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { useArchiveTask, useTasks } from '../../../src/features/tasks/hooks';
import type { Task } from '../../../src/features/tasks/types';
import { OwnYearTaskRow } from '../../../src/features/templates/components/OwnYearTaskRow';
import { TemplateRow } from '../../../src/features/templates/components/TemplateRow';
import { useActivateTemplates, useTemplates } from '../../../src/features/templates/hooks';
import { groupByMonth, suggestForHousehold } from '../../../src/features/templates/suggest';
import type { TaskTemplate } from '../../../src/features/templates/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { usePullToRefresh } from '../../../src/lib/usePullToRefresh';

/**
 * Årshjul: tolv måneder med denne måneden øverst. Hver måned viser malene som passer
 * husstanden, med en bryter for å aktivere (lage oppgave) eller deaktivere (arkivere den),
 * og husstandens egne årlige oppgaver, merket «Egen». Trykk på en egen oppgave åpner den.
 * Voksne lager nye med «+» øverst til høyre (én eller flere måneder).
 */
export default function YearScreen() {
  // Fanene vises bare med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { session } = useSession();
  const { data: members = [] } = useMembers(householdId);
  const templates = useTemplates();
  const tasks = useTasks(householdId);
  const activate = useActivateTemplates(householdId);
  const archive = useArchiveTask(householdId);

  // Bryterens verdi mens en endring lagres, så den ikke hopper tilbake før listen er hentet på nytt.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdult = members.find((m) => m.auth_user_id === session?.user.id)?.role === 'adult';
  const suggested = suggestForHousehold(templates.data ?? [], household!);
  // Bare rekkefølgen avhenger av mobilens dato. Frister regnes alltid ut i databasen.
  const sections = groupByMonth(suggested, tasks.data ?? [], new Date().getMonth() + 1);
  const nameOf = (memberId: string | null) =>
    members.find((m) => m.id === memberId)?.display_name ?? 'Felles';

  // «+» øverst til høyre åpner «Ny årlig oppgave». Bare for voksne, som i «I dag».
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAdult
        ? () => (
            <View style={styles.addButton}>
              <IconButton
                icon="add"
                size={40}
                accessibilityLabel="Ny årlig oppgave"
                onPress={() => router.push('/year-task/new')}
              />
            </View>
          )
        : undefined,
    });
  }, [navigation, isAdult]);

  const taskByTemplate = new Map<string, Task>();
  for (const t of tasks.data ?? []) if (t.template_id) taskByTemplate.set(t.template_id, t);
  const notActive = suggested.filter((t) => !taskByTemplate.has(t.id));

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

  function chooseRecommended() {
    const ids = notActive.map((t) => t.id);
    Alert.alert(
      'Velg anbefalte?',
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
      style={styles.flex}
      contentContainerStyle={styles.container}
      sections={sections}
      keyExtractor={(item) => item.key}
      stickySectionHeadersEnabled={false}
      {...pullToRefresh}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="meta" color={colors.textMuted}>
            Faste oppgaver gjennom året. Slå på det som passer, eller lag egne med +. Når
            måneden kommer, dukker de opp under «Denne måneden» i «I dag».
          </Text>
          {isAdult && notActive.length > 0 && (
            <Button
              title="Velg anbefalte"
              variant="secondary"
              onPress={chooseRecommended}
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
          <Message tone="muted">Ingenting denne måneden.</Message>
        ) : null
      }
      renderItem={({ item }) => {
        if (item.kind === 'own') {
          return (
            <OwnYearTaskRow
              task={item.task}
              assigneeName={nameOf(item.task.assigned_member_id)}
              onPress={
                isAdult
                  ? () => router.push({ pathname: '/task/[id]', params: { id: item.task.id } })
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
          />
        );
      }}
    />
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.page, paddingBottom: 48 },
  header: { gap: 12 },
  month: { marginTop: spacing.section + 6, marginBottom: spacing.row },
  separator: { height: spacing.row },
  addButton: { paddingHorizontal: 12 },
});
