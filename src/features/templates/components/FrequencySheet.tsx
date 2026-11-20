import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Hint, Sheet, spacing, Text } from '../../../ui';
import { toIsoDate } from '../../../lib/dates';
import { RecurrencePicker } from '../../tasks/components/RecurrencePicker';
import { toRecurrence } from '../../tasks/recurrence';
import { routineForm, routineFromSchedule, type RoutineRecurrence } from '../routines';
import type { TaskTemplate } from '../types';

type Props = {
  /** Raden arket er åpent for. null = lukket. */
  template: TaskTemplate | null;
  /** Det som er valgt på raden nå: en endring, eller malens egen. */
  current: RoutineRecurrence | null;
  onChoose: (recurrence: RoutineRecurrence) => void;
  onClose: () => void;
};

/**
 * «Hvor ofte?»: samme gjentakelsesvelger som oppgaveskjemaet, bare med det en rutine kan ha
 * (repeatOnly), forhåndsutfylt med det som er valgt på raden. «Bruk» og «Avbryt» står alltid
 * nederst: velgeren ruller når arket ikke får plass (Sheet har maks 85 % av høyden).
 */
export function FrequencySheet({ template, current, onChoose, onClose }: Props) {
  return (
    <Sheet visible={template !== null} title="Hvor ofte?" onClose={onClose}>
      {/* key: ny rad = nytt skjema. */}
      {template && current && (
        <SheetContent key={template.id} template={template} current={current} onChoose={onChoose} onClose={onClose} />
      )}
    </Sheet>
  );
}

function SheetContent({
  template,
  current,
  onChoose,
  onClose,
}: Props & { template: TaskTemplate; current: RoutineRecurrence }) {
  const [today] = useState(() => toIsoDate(new Date()));
  const [form, setForm] = useState(() => routineForm(current, today));
  const chosen = routineFromSchedule(toRecurrence(form, today));

  return (
    <>
      <Text>{template.title}</Text>
      <ScrollView
        style={styles.picker}
        contentContainerStyle={styles.pickerContent}
        keyboardShouldPersistTaps="handled"
      >
        <RecurrencePicker value={form} onChange={setForm} today={today} repeatOnly />
        <Hint>Endringen gjelder bare denne oppgaven.</Hint>
      </ScrollView>
      <Button title="Bruk" onPress={() => chosen && onChoose(chosen)} disabled={!chosen} />
      <Button variant="text" title="Avbryt" onPress={onClose} />
    </>
  );
}

const styles = StyleSheet.create({
  // Krymper når arket når maks høyde, så knappene under alltid er synlige.
  picker: { flexGrow: 0, flexShrink: 1 },
  pickerContent: { gap: spacing.row },
});
