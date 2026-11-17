import { useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/components/theme';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { useArchiveTask, useTasks } from '../../../src/features/tasks/hooks';
import type { Task } from '../../../src/features/tasks/types';
import { TemplateRow } from '../../../src/features/templates/components/TemplateRow';
import { useActivateTemplates, useTemplates } from '../../../src/features/templates/hooks';
import { groupByMonth, suggestForHousehold } from '../../../src/features/templates/suggest';
import type { TaskTemplate } from '../../../src/features/templates/types';
import { toNorwegianMessage } from '../../../src/lib/errors';

/**
 * Årshjul: tolv måneder med denne måneden øverst. Hver måned viser malene som passer
 * husstanden, med en bryter for å aktivere (lage oppgave) eller deaktivere (arkivere den).
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
  const sections = groupByMonth(suggested, new Date().getMonth() + 1);

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

  return (
    <SectionList
      style={styles.flex}
      contentContainerStyle={styles.container}
      sections={sections}
      keyExtractor={(t) => t.id}
      stickySectionHeadersEnabled={false}
      onRefresh={() => {
        templates.refetch();
        tasks.refetch();
      }}
      refreshing={templates.isRefetching || tasks.isRefetching}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.intro}>
            Faste oppgaver gjennom året. Slå på det som passer, så dukker det opp under «Denne
            måneden» i «I dag» når måneden kommer.
          </Text>
          {isAdult && notActive.length > 0 && (
            <Button
              title="Velg anbefalte"
              variant="outline"
              onPress={chooseRecommended}
              disabled={activate.isPending}
            />
          )}
          {!isAdult && members.length > 0 && (
            <Text style={styles.muted}>Bare voksne kan endre årshjulet.</Text>
          )}
          {(loadError || actionError) && (
            <Text style={styles.error}>{actionError ?? toNorwegianMessage(loadError)}</Text>
          )}
        </View>
      }
      renderSectionHeader={({ section }) => <Text style={styles.month}>{section.title}</Text>}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 && !templates.isPending ? (
          <Text style={styles.muted}>Ingen forslag denne måneden.</Text>
        ) : null
      }
      renderItem={({ item }) => {
        const task = taskByTemplate.get(item.id) ?? null;
        const isPending = item.id in pending;
        return (
          <TemplateRow
            template={item}
            task={task}
            value={isPending ? pending[item.id] : task !== null}
            disabled={!isAdult || isPending}
            onToggle={(on) => toggle(item, on)}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingBottom: 48 },
  header: { gap: 12, marginBottom: 8 },
  intro: { fontSize: 15, color: colors.text },
  month: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 4 },
  muted: { fontSize: 15, color: colors.muted },
  error: { color: colors.danger, fontSize: 15 },
});
