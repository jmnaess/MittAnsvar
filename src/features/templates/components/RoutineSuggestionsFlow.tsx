import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, CheckRow, Hint, Message, Section, spacing, Text, useTheme } from '../../../ui';
import { toNorwegianMessage } from '../../../lib/errors';
import { useMemberPhotoLookup, useMembers } from '../../household/hooks';
import { describeRecurrence } from '../../tasks/recurrence';
import { useTasks } from '../../tasks/hooks';
import { useActivateRoutines, useTemplates } from '../hooks';
import {
  activeRoutineKeys,
  childHeading,
  defaultSelection,
  routineChoices,
  routineKey,
  sharedHeading,
  suggestRoutines,
  toActivation,
  type RoutineSuggestions,
} from '../routines';
import type { SuggestionHousehold } from '../suggest';
import type { TaskTemplate } from '../types';

type Props = {
  householdId: string;
  household: SuggestionHousehold;
  /** onboarding: egen tittel og «Hopp over». settings: «Ikke nå». */
  variant: 'onboarding' | 'settings';
  onDone: () => void;
};

/**
 * «Forslag til hverdagen»: felles rutiner og rutiner per barn ut fra alderen. Noen få er avhuket
 * fra start (suggested_by_default). «Legg til» lager oppgavene via activate_templates: barnemaler
 * tildeles barnet (med lønnsforslaget), resten blir felles. Det som er lagt til, vises ikke igjen.
 */
export function RoutineSuggestionsFlow({ householdId, household, variant, onDone }: Props) {
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
      variant={variant}
      onDone={onDone}
    />
  );
}

type ListProps = Omit<Props, 'household'> & {
  householdType: SuggestionHousehold['type'];
  suggestions: RoutineSuggestions;
};

function SuggestionList({ householdId, householdType, suggestions: initial, variant, onDone }: ListProps) {
  const { colors } = useTheme();
  const isOnboarding = variant === 'onboarding';
  const activate = useActivateRoutines(householdId);
  const photoOf = useMemberPhotoLookup(householdId);
  const [suggestions] = useState(initial);
  const [selected, setSelected] = useState(() => defaultSelection(suggestions));
  const choices = routineChoices(suggestions);
  const busy = activate.isPending;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function add() {
    activate.mutate(toActivation(choices, selected), { onSuccess: onDone });
  }

  const row = (t: TaskTemplate, memberId: string | null) => {
    const key = routineKey(t.id, memberId);
    return (
      <CheckRow
        key={key}
        title={t.title}
        meta={routineMeta(t)}
        checked={selected.has(key)}
        onToggle={() => toggle(key)}
        disabled={busy}
      />
    );
  };

  return (
    <>
      {isOnboarding && <Text variant="pageTitle">Hverdagen</Text>}
      <Text>
        Forslag til faste oppgaver i hjemmet. Barna får forslag som passer alderen. Huk av det dere
        vil ha, og endre eller fordel etterpå.
      </Text>

      {choices.length === 0 && <Message tone="muted">Ingen nye forslag akkurat nå.</Message>}

      {suggestions.shared.length > 0 && (
        <Section {...sharedHeading(householdType)}>
          <View style={styles.list}>{suggestions.shared.map((t) => row(t, null))}</View>
        </Section>
      )}

      {suggestions.children.map(({ member, age, templates }) => (
        <Section
          key={member.id}
          title={childHeading(member.display_name, age)}
          right={<Avatar avatar={member.avatar} photo={photoOf(member)} size={32} />}
        >
          {templates.length > 0 && (
            <View style={styles.list}>{templates.map((t) => row(t, member.id))}</View>
          )}
          {age === null && (
            <Hint>{`Legg inn fødselsår under Husstand, så får ${member.display_name} forslag som passer alderen.`}</Hint>
          )}
        </Section>
      ))}

      {activate.error && <Message>{toNorwegianMessage(activate.error)}</Message>}
      {choices.length > 0 && (
        <Button
          title={selected.size > 0 ? `Legg til (${selected.size})` : 'Legg til'}
          onPress={add}
          disabled={selected.size === 0 || busy}
        />
      )}
      <Button
        variant="text"
        title={choices.length === 0 ? 'Ferdig' : isOnboarding ? 'Hopp over' : 'Ikke nå'}
        onPress={onDone}
        disabled={busy}
      />
      {isOnboarding && (
        <Text variant="meta" color={colors.textMuted} style={styles.later}>
          Du finner forslagene igjen i Innstillinger.
        </Text>
      )}
    </>
  );
}

/** «Hver dag», «Hver lørdag · 20 kr». */
function routineMeta(t: TaskTemplate): string {
  const when = describeRecurrence({ ...t, job_repeats: false });
  return t.reward_nok ? `${when} · ${t.reward_nok} kr` : when;
}

const styles = StyleSheet.create({
  list: { gap: spacing.row },
  later: { textAlign: 'center' },
});
