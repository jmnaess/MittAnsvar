import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, CheckRow, Message, spacing, Text, useTheme } from '../../../ui';
import { toNorwegianMessage } from '../../../lib/errors';
import { HomeProfileFields } from '../../household/components/HomeProfileFields';
import { homeProfileChanges, suggestionBaseline } from '../../household/homeProfile';
import { useUpdateHousehold } from '../../household/hooks';
import type { HomeProfile, HouseholdType } from '../../household/types';
import { useHowToSheet } from '../../tasks/components/HowToSheet';
import { howToForTemplate } from '../../tasks/howTo';
import { useTasks } from '../../tasks/hooks';
import { useActivateTemplates, useTemplates } from '../hooks';
import {
  activeTemplateIds,
  groupSuggestions,
  suggestAfterProfileChange,
  type SuggestionGroup,
} from '../suggest';

type Props = {
  householdId: string;
  householdType: HouseholdType;
  /** Profilen slik den er lagret nå. Oppstart: bare boligtype (emptyHomeProfile). */
  saved: HomeProfile;
  /** onboarding: egen tittel, «Hopp over», og ingen henting av husstanden (se useUpdateHousehold). */
  variant: 'onboarding' | 'settings';
  onDone: () => void;
};

type Step = { kind: 'form' } | { kind: 'suggestions'; groups: SuggestionGroup[] } | { kind: 'none' };

/**
 * Hjemprofil i to steg: spørsmålene, så forslag ut fra svarene (alle valgt) som en voksen kan
 * velge bort før «Legg til». Forslagene blir vanlige oppgaver (felles, ingen tildelt) via
 * activate_templates. Eksisterende oppgaver røres aldri.
 */
export function HomeProfileFlow({ householdId, householdType, saved, variant, onDone }: Props) {
  const isOnboarding = variant === 'onboarding';
  const update = useUpdateHousehold(householdId, { refetch: !isOnboarding });
  const templates = useTemplates();
  const tasks = useTasks(householdId);

  // Forslagene sammenlignes med profilen slik den var da skjermen ble åpnet.
  const [baseline] = useState(() => suggestionBaseline({ type: householdType, ...saved }));
  const [profile, setProfile] = useState(saved);
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [error, setError] = useState<string | null>(null);

  const ready = !!templates.data && !!tasks.data;

  async function save() {
    if (!templates.data || !tasks.data) return;
    setError(null);
    try {
      const changes = homeProfileChanges(saved, profile);
      if (Object.keys(changes).length > 0) await update.mutateAsync(changes);
    } catch (e) {
      setError(toNorwegianMessage(e));
      return;
    }
    const suggestions = suggestAfterProfileChange(
      templates.data,
      baseline,
      { type: householdType, ...profile },
      activeTemplateIds(tasks.data),
    );
    if (suggestions.length > 0) setStep({ kind: 'suggestions', groups: groupSuggestions(suggestions) });
    else if (isOnboarding) onDone();
    else setStep({ kind: 'none' });
  }

  const loadError = templates.error ?? tasks.error;

  if (step.kind === 'suggestions') {
    return <SuggestionsStep householdId={householdId} groups={step.groups} onDone={onDone} />;
  }

  if (step.kind === 'none') {
    return (
      <>
        <Message tone="success">Lagret. Svarene gir ingen nye forslag.</Message>
        <Button title="Ferdig" onPress={onDone} />
      </>
    );
  }

  return (
    <>
      {isOnboarding && <Text variant="pageTitle">Om hjemmet</Text>}
      <Text>
        Noen få spørsmål om boligen, så husker årshjulet vedlikeholdet for dere.
        {isOnboarding && ' Du kan endre svarene senere i Innstillinger.'}
      </Text>
      <HomeProfileFields value={profile} onChange={setProfile} disabled={update.isPending} />
      {(error || loadError) && <Message>{error ?? toNorwegianMessage(loadError)}</Message>}
      <Button
        title={isOnboarding ? 'Vis forslag' : 'Lagre'}
        onPress={save}
        disabled={!ready || update.isPending}
      />
      {isOnboarding && (
        <Button variant="text" title="Hopp over" onPress={onDone} disabled={update.isPending} />
      )}
    </>
  );
}

type SuggestionsStepProps = { householdId: string; groups: SuggestionGroup[]; onDone: () => void };

function SuggestionsStep({ householdId, groups, onDone }: SuggestionsStepProps) {
  const { colors } = useTheme();
  const activate = useActivateTemplates(householdId);
  const templates = useTemplates();
  const { infoPress, sheet: howToSheet } = useHowToSheet();
  // Gruppens nøkkel er id-en til den første malen i gruppen (groupSuggestions).
  const howToOf = (group: SuggestionGroup) => {
    const first = templates.data?.find((t) => t.id === group.key);
    return first ? howToForTemplate(first) : null;
  };
  // Alle forslag er valgt fra start.
  const [selected, setSelected] = useState(() => new Set(groups.map((g) => g.key)));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function add() {
    const ids = groups.filter((g) => selected.has(g.key)).flatMap((g) => g.templateIds);
    activate.mutate(ids, { onSuccess: onDone });
  }

  return (
    <>
      <Text variant="sectionTitle" accessibilityRole="header">Forslag til årshjulet</Text>
      <Text variant="meta" color={colors.textMuted}>
        Fjern haken på det som ikke passer. Oppgavene blir felles, og dere kan fordele og endre dem
        etterpå.
      </Text>
      <View style={styles.list}>
        {groups.map((group) => (
          <CheckRow
            key={group.key}
            title={group.title}
            meta={group.when}
            checked={selected.has(group.key)}
            onToggle={() => toggle(group.key)}
            disabled={activate.isPending}
            onInfoPress={infoPress(howToOf(group))}
          />
        ))}
      </View>
      {activate.error && <Message>{toNorwegianMessage(activate.error)}</Message>}
      <Button
        title={selected.size > 0 ? `Legg til (${selected.size})` : 'Legg til'}
        onPress={add}
        disabled={selected.size === 0 || activate.isPending}
      />
      <Button variant="text" title="Ikke nå" onPress={onDone} disabled={activate.isPending} />
      {howToSheet}
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.row },
});
