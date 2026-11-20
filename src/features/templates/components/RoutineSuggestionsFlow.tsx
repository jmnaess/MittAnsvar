import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  CheckRow,
  Chip,
  ChoiceChip,
  ChoiceChips,
  Hint,
  ListRow,
  Message,
  Section,
  Sheet,
  ShowMoreRow,
  spacing,
  Text,
  useTheme,
} from '../../../ui';
import { toNorwegianMessage } from '../../../lib/errors';
import { useMemberPhotoLookup, useMembers } from '../../household/hooks';
import { useTasks } from '../../tasks/hooks';
import type { Task } from '../../tasks/types';
import { useActivateRoutines, useRemoveRoutine, useTemplates } from '../hooks';
import {
  activeRoutineKeys,
  childHeading,
  defaultSelection,
  frequencyKey,
  frequencyOptions,
  recurrenceLabel,
  recurrenceOverrides,
  restoreSuggestion,
  routineChoices,
  routineKey,
  routineSections,
  sharedHeading,
  suggestRoutines,
  tasksForRoutine,
  toActivation,
  type ChildSuggestions,
  type RoutineRecurrence,
  type RoutineSuggestions,
} from '../routines';
import { routineButtons } from '../stepActions';
import type { SuggestionHousehold } from '../suggest';
import type { TaskTemplate } from '../types';

type Props = {
  householdId: string;
  household: SuggestionHousehold;
  /** onboarding: egen tittel og «Hopp over». settings: «Ikke nå». */
  variant: 'onboarding' | 'settings';
  onDone: () => void;
  /** Satt: «Tilbake» nederst (oppstarten, til forrige steg). */
  onBack?: () => void;
};

/**
 * «Forslag til hverdagen»: felles rutiner og rutiner per barn. Forslagene som passer alderen
 * vises først, resten under «Vis flere forslag», sortert etter alder. Noen få av de som passer
 * alderen er avhuket fra start (suggested_by_default). Hyppigheten kan endres per rad før den
 * legges til («Hvor ofte?»); malen er standard. «Legg til» lager oppgavene via activate_templates:
 * barnemaler tildeles barnet (med lønnsforslaget), resten blir felles. Det som er lagt til, vises
 * dempet nederst i seksjonen, merket «Lagt til», med oppgavens egen hyppighet. «Fjern» arkiverer
 * oppgaven og gjør forslaget valgbart igjen (i Innstillinger etter et spørsmål).
 */
export function RoutineSuggestionsFlow({ householdId, household, variant, onDone, onBack }: Props) {
  const templates = useTemplates();
  const tasks = useTasks(householdId);
  const members = useMembers(householdId);
  const loadError = templates.error ?? tasks.error ?? members.error;

  if (!templates.data || !tasks.data || !members.data) {
    return loadError ? <Message>{toNorwegianMessage(loadError)}</Message> : null;
  }

  // SuggestionList holder på listen fra første visning, så den ikke endrer seg mens man velger.
  const suggestions = suggestRoutines(
    templates.data,
    household,
    members.data,
    activeRoutineKeys(tasks.data),
    new Date().getFullYear(),
  );
  return (
    <SuggestionList
      householdId={householdId}
      householdType={household.type}
      suggestions={suggestions}
      templateOrder={templates.data}
      tasks={tasks.data}
      variant={variant}
      onDone={onDone}
      onBack={onBack}
    />
  );
}

type ListProps = Omit<Props, 'household'> & {
  householdType: SuggestionHousehold['type'];
  suggestions: RoutineSuggestions;
  /** Alle maler i vanlig rekkefølge: et fjernet forslag settes inn på sin plass igjen. */
  templateOrder: TaskTemplate[];
  /** Husstandens aktive oppgaver: hyppigheten på «Lagt til» og hva «Fjern» arkiverer. */
  tasks: Task[];
};

/** Raden som har «Hvor ofte?» åpent. */
type FrequencyTarget = { key: string; template: TaskTemplate };

function SuggestionList({
  householdId,
  householdType,
  suggestions: initial,
  templateOrder,
  tasks,
  variant,
  onDone,
  onBack,
}: ListProps) {
  const { colors } = useTheme();
  const isOnboarding = variant === 'onboarding';
  const activate = useActivateRoutines(householdId);
  const remove = useRemoveRoutine(householdId);
  const photoOf = useMemberPhotoLookup(householdId);
  const [suggestions, setSuggestions] = useState(initial);
  const [selected, setSelected] = useState(() => defaultSelection(initial));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  // Bare radene der hyppigheten er endret fra malen (nøkkel = routineKey).
  const [frequency, setFrequency] = useState<Map<string, RoutineRecurrence>>(() => new Map());
  const [frequencyTarget, setFrequencyTarget] = useState<FrequencyTarget | null>(null);
  const choices = routineChoices(suggestions);
  const hasAdded =
    suggestions.sharedAdded.length > 0 || suggestions.children.some((c) => c.added.length > 0);
  const busy = activate.isPending || remove.isPending;
  const buttons = routineButtons({
    choiceCount: choices.length,
    selectedCount: selected.size,
    isOnboarding,
    hasAdded,
  });

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleExpanded(memberId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  function add() {
    activate.mutate(
      { ...toActivation(choices, selected), overrides: recurrenceOverrides(choices, selected, frequency) },
      { onSuccess: onDone },
    );
  }

  /** Valg i «Hvor ofte?»: malens hyppighet fjerner endringen. Raden blir avhuket. */
  function chooseFrequency(target: FrequencyTarget, optionKey: string) {
    const option = frequencyOptions(target.template).find((o) => o.key === optionKey);
    if (!option) return;
    setFrequency((prev) => {
      const next = new Map(prev);
      if (option.key === frequencyKey(target.template)) next.delete(target.key);
      else next.set(target.key, option.recurrence);
      return next;
    });
    setSelected((prev) => new Set(prev).add(target.key));
    setFrequencyTarget(null);
  }

  function removeAdded(t: TaskTemplate, memberId: string | null) {
    const ids = tasksForRoutine(tasks, t.id, memberId).map((task) => task.id);
    const run = () =>
      remove.mutate(ids, {
        onSuccess: () => setSuggestions((s) => restoreSuggestion(s, t.id, memberId, templateOrder)),
      });
    // I oppstarten er oppgaven nettopp lagt til. I Innstillinger kan den være endret og gjort mange ganger.
    if (isOnboarding) return run();
    Alert.alert(`Fjerne «${t.title}»?`, 'Oppgaven forsvinner fra Oppgaver.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Fjern', style: 'destructive', onPress: run },
    ]);
  }

  const row = (t: TaskTemplate, memberId: string | null) => {
    const key = routineKey(t.id, memberId);
    const when = recurrenceLabel(frequency.get(key) ?? t);
    const meta = memberId && t.reward_nok ? `${t.reward_nok} kr` : undefined;
    return (
      <CheckRow
        key={key}
        title={t.title}
        meta={meta}
        checked={selected.has(key)}
        onToggle={() => toggle(key)}
        disabled={busy}
        compact
        below={
          <ChoiceChip
            role="button"
            label={when}
            icon="repeat-outline"
            selected={false}
            onPress={() => setFrequencyTarget({ key, template: t })}
            disabled={busy}
            accessibilityLabel={`Hvor ofte: ${when}. Endre`}
          />
        }
      />
    );
  };

  // Allerede lagt til: dempet, uten avkrysning, med oppgavens egen hyppighet og lønn.
  const addedRow = (t: TaskTemplate, memberId: string | null) => {
    const task = tasksForRoutine(tasks, t.id, memberId)[0];
    const meta = task ? taskMeta(task) : recurrenceLabel(t);
    return (
      <View key={`added-${routineKey(t.id, memberId)}`} style={styles.addedRow}>
        <View style={styles.added}>
          <ListRow
            title={t.title}
            meta={meta}
            muted
            right={<Chip label="Lagt til" />}
            accessibilityLabel={`${t.title}. ${meta}. Lagt til`}
          />
        </View>
        <View style={styles.removeAction}>
          <Button
            variant="text"
            small
            title="Fjern"
            onPress={() => removeAdded(t, memberId)}
            disabled={busy}
            accessibilityLabel={`Fjern ${t.title}`}
          />
        </View>
      </View>
    );
  };

  // Ett avsnitt per barn: forslag som passer alderen, «Vis flere forslag», og det som er lagt til.
  const childSection = ({ member, age, templates, more, added }: ChildSuggestions) => (
    <Section
      key={member.id}
      title={childHeading(member.display_name, age)}
      right={<Avatar avatar={member.avatar} photo={photoOf(member)} size={32} />}
    >
      {templates.length > 0 && <View style={styles.list}>{templates.map((t) => row(t, member.id))}</View>}
      {more.length > 0 && (
        <ShowMoreRow
          label="Vis flere forslag"
          accessibilityLabel={`Vis flere forslag til ${member.display_name}`}
          expanded={expanded.has(member.id)}
          onPress={() => toggleExpanded(member.id)}
        />
      )}
      {more.length > 0 && expanded.has(member.id) && (
        <View style={styles.list}>{more.map((t) => row(t, member.id))}</View>
      )}
      {added.length > 0 && <View style={styles.list}>{added.map((t) => addedRow(t, member.id))}</View>}
      {age === null && (
        <Hint>{`Legg inn fødselsår under Husstand, så får ${member.display_name} forslag som passer alderen.`}</Hint>
      )}
    </Section>
  );

  return (
    <>
      {isOnboarding && <Text variant="pageTitle">Hverdagen</Text>}
      <Text>
        Her er forslag til faste oppgaver, og barna får forslag som passer alderen. Huk av det dere
        vil ha. Dere kan endre og fordele etterpå.
      </Text>

      {choices.length === 0 && <Message tone="muted">Ingen nye forslag akkurat nå.</Message>}

      {/* Barna først, ett avsnitt per barn, så det felles (routineSections). */}
      {routineSections(suggestions).map((section) =>
        section.kind === 'shared' ? (
          <Section key="shared" {...sharedHeading(householdType)}>
            <View style={styles.list}>
              {section.templates.map((t) => row(t, null))}
              {section.added.map((t) => addedRow(t, null))}
            </View>
          </Section>
        ) : (
          childSection(section.child)
        ),
      )}

      {activate.error && <Message>{toNorwegianMessage(activate.error)}</Message>}
      {remove.error && <Message>{toNorwegianMessage(remove.error)}</Message>}
      {choices.length > 0 && (
        <Button title={buttons.primaryTitle} onPress={add} disabled={selected.size === 0 || busy} />
      )}
      {/* «Hopp over» / «Ikke nå» lagrer ingenting: valgene finnes bare her i skjermen. */}
      <Button
        variant="text"
        small={buttons.skipSmall}
        title={buttons.skipTitle ?? ''}
        onPress={onDone}
        disabled={busy}
      />
      {onBack && <Button variant="text" title="Tilbake" onPress={onBack} disabled={busy} />}
      {isOnboarding && (
        <Text variant="meta" color={colors.textMuted} style={styles.later}>
          Du kan endre dette senere under Innstillinger.
        </Text>
      )}

      <Sheet
        visible={frequencyTarget !== null}
        title="Hvor ofte?"
        onClose={() => setFrequencyTarget(null)}
      >
        {frequencyTarget && (
          <>
            <Text>{frequencyTarget.template.title}</Text>
            <ChoiceChips
              options={frequencyOptions(frequencyTarget.template).map((o) => ({ value: o.key, label: o.label }))}
              value={frequencyKey(frequency.get(frequencyTarget.key) ?? frequencyTarget.template)}
              onChange={(optionKey) => chooseFrequency(frequencyTarget, optionKey)}
            />
            <Hint>Det første valget er forslaget. Endringen gjelder bare denne oppgaven.</Hint>
            <Button variant="text" title="Lukk" onPress={() => setFrequencyTarget(null)} />
          </>
        )}
      </Sheet>
    </>
  );
}

/** Oppgavens egen hyppighet og lønn: «Hver dag», «Annenhver lørdag · 20 kr». */
function taskMeta(task: Task): string {
  const when = recurrenceLabel(task);
  return task.reward_nok ? `${when} · ${task.reward_nok} kr` : when;
}

const styles = StyleSheet.create({
  // Tettere enn spacing.row (10): radene er compact (se CheckRow).
  list: { gap: 6 },
  addedRow: { gap: 2 },
  removeAction: { alignItems: 'flex-end' },
  added: { opacity: 0.7 },
  later: { textAlign: 'center' },
});
