import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Sheet, Text, useTheme } from '../../../ui';
import { useTemplates } from '../../templates/hooks';
import type { TaskTemplate } from '../../templates/types';
import { howToForTask, type HowTo, type HowToTask } from '../howTo';

/** «Slik gjør du», teksten og kilden. Brukes i arket og øverst på redigeringsskjermen. */
export function HowToContent({ howTo }: { howTo: HowTo }) {
  const { colors } = useTheme();
  const { source } = howTo;
  const url = source?.url;
  return (
    <View style={styles.content}>
      <Text variant="metaStrong" color={colors.textWarm} accessibilityRole="header">Slik gjør du</Text>
      <Text>{howTo.text}</Text>
      {source &&
        (url ? (
          <Text
            variant="meta"
            color={colors.primary}
            accessibilityRole="link"
            accessibilityHint="Åpner kilden i nettleseren"
            onPress={() => Linking.openURL(url)}
          >
            Kilde: {source.name}
          </Text>
        ) : (
          <Text variant="meta" color={colors.textMuted}>Kilde: {source.name}</Text>
        ))}
    </View>
  );
}

type SheetProps = { howTo: HowTo | null; onClose: () => void };

/** Arket bak (i)-ikonet. Tittelen er oppgavens. */
export function HowToSheet({ howTo, onClose }: SheetProps) {
  // Beholder innholdet mens arket tones ut, så det ikke blir tomt før det er borte.
  const last = useRef<HowTo | null>(null);
  if (howTo) last.current = howTo;
  const shown = howTo ?? last.current;
  return (
    <Sheet visible={!!howTo} title={shown?.title} onClose={onClose}>
      {shown && <HowToContent howTo={shown} />}
      <Button variant="text" title="Lukk" onPress={onClose} />
    </Sheet>
  );
}

/**
 * Arket og en funksjon som lager onInfoPress: `infoPress(howTo)` gir undefined når det ikke er
 * noe å vise, så raden ikke får ikon. Legg `sheet` ett sted i skjermen.
 */
export function useHowToSheet() {
  const [howTo, setHowTo] = useState<HowTo | null>(null);
  const infoPress = useCallback(
    (h: HowTo | null) => (h ? () => setHowTo(h) : undefined),
    [],
  );
  const sheet = <HowToSheet howTo={howTo} onClose={() => setHowTo(null)} />;
  return { infoPress, sheet };
}

/**
 * howToForTask med malene fra useTemplates. Mens malene hentes, avgjør oppgavens egen
 * gjentakelse om den er en rutine (se howTo.ts).
 */
export function useTaskHowTo() {
  const templates = useTemplates();
  const byId = useMemo(
    () => new Map<string, TaskTemplate>((templates.data ?? []).map((t) => [t.id, t])),
    [templates.data],
  );
  return useCallback(
    (task: HowToTask, options?: { always?: boolean }) =>
      howToForTask(task, task.template_id ? byId.get(task.template_id) : null, options),
    [byId],
  );
}

const styles = StyleSheet.create({
  content: { gap: 6 },
});
