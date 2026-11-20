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
import { homeFormButtons, homeSuggestionButtons } from '../stepActions';
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
  /** Etter lagret profil. Oppstarten husker den, så skjemaet er utfylt når man går tilbake. */
  onSaved?: (profile: HomeProfile) => void;
  /** Satt: «Tilbake» under spørsmålene (oppstarten, til forrige steg). */
  onBack?: () => void;
};

type Step = { kind: 'form' } | { kind: 'suggestions'; groups: SuggestionGroup[] } | { kind: 'none' };

/**
 * Hjemprofil i to steg: spørsmålene, så forslag ut fra svarene (alle valgt) som en voksen kan
 * velge bort før «Legg til». Forslagene blir vanlige oppgaver (felles, ingen tildelt) via
 * activate_templates. Eksisterende oppgaver røres aldri.
 */
export function HomeProfileFlow({ householdId, householdType, saved, variant, onDone, onSaved, onBack }: Props) {
  const isOnboarding = variant === 'onboarding';
  const update = useUpdateHousehold(householdId, { refetch: !isOnboarding });
  const templates = useTemplates();
  const tasks = useTasks(householdId);

  // Forslagene sammenlignes med profilen slik den var da skjermen ble åpnet. I oppstarten alltid
  // som første gang (null): går man tilbake, ser man alt som passer og ikke er lagt til ennå.
  const [baseline] = useState(() =>
    isOnboarding ? null : suggestionBaseline({ type: householdType, ...saved }),
  );
  const [profile, setProfile] = useState(saved);
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [error, setError] = useState<string | null>(null);

  const ready = !!templates.data && !!tasks.data;
  // Endret fra det som er lagret? Da lagrer hovedknappen, og «Hopp over» blir liten (lagrer ingenting).
  const changed = Object.keys(homeProfileChanges(saved, profile)).length > 0;
  const buttons = homeFormButtons({ isOnboarding, changed });

  async function save() {
    if (!templates.data || !tasks.data) return;
    setError(null);
    try {
      const changes = homeProfileChanges(saved, profile);
      if (Object.keys(changes).length > 0) await update.mutateAsync(changes);
      onSaved?.(profile);
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
    return (
      <SuggestionsStep
        householdId={householdId}
        groups={step.groups}
        isOnboarding={isOnboarding}
        onDone={onDone}
        onBack={isOnboarding ? () => setStep({ kind: 'form' }) : undefined}
      />
    );
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
      </Text>
      <HomeProfileFields value={profile} onChange={setProfile} disabled={update.isPending} />
      {(error || loadError) && <Message>{error ?? toNorwegianMessage(loadError)}</Message>}
      <Button title={buttons.primaryTitle} onPress={save} disabled={!ready || update.isPending} />
      {/* «Hopp over» lagrer ingenting: svarene som ikke er lagret, glemmes. */}
      {buttons.skipTitle && (
        <Button
          variant="text"
          small={buttons.skipSmall}
          title={buttons.skipTitle}
          onPress={onDone}
          disabled={update.isPending}
        />
      )}
      {onBack && <Button variant="text" title="Tilbake" onPress={onBack} disabled={update.isPending} />}
      {isOnboarding && <LaterNote />}
    </>
  );
}

/** «Du kan endre dette senere under Innstillinger.» nederst på stegene i oppstarten. */
function LaterNote() {
  const { colors } = useTheme();
  return (
    <Text variant="meta" color={colors.textMuted} style={styles.later}>
      Du kan endre dette senere under Innstillinger.
    </Text>
  );
}

type SuggestionsStepProps = {
  householdId: string;
  groups: SuggestionGroup[];
  isOnboarding: boolean;
  onDone: () => void;
  /** Tilbake til spørsmålene (oppstarten). */
  onBack?: () => void;
};

function SuggestionsStep({ householdId, groups, isOnboarding, onDone, onBack }: SuggestionsStepProps) {
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
  const buttons = homeSuggestionButtons({ selectedCount: selected.size, isOnboarding });

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
        title={buttons.primaryTitle}
        onPress={add}
        disabled={selected.size === 0 || activate.isPending}
      />
      {/* «Hopp over» / «Ikke nå» legger ikke til noen av forslagene. */}
      <Button
        variant="text"
        small={buttons.skipSmall}
        title={buttons.skipTitle ?? ''}
        onPress={onDone}
        disabled={activate.isPending}
      />
      {onBack && <Button variant="text" title="Tilbake" onPress={onBack} disabled={activate.isPending} />}
      {onBack && <LaterNote />}
      {howToSheet}
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.row },
  later: { textAlign: 'center' },
});
