import { useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { Button, ChoiceChips, Hint, Sheet, Text } from '../../../ui';
import { toIsoDate } from '../../../lib/dates';
import { RecurrencePicker } from '../../tasks/components/RecurrencePicker';
import { fromRecurrence, toRecurrence, type RecurrenceForm } from '../../tasks/recurrence';
import {
  frequencyKey,
  frequencyOptions,
  routineFromSchedule,
  routineRecurrence,
  type RoutineRecurrence,
} from '../routines';
import type { TaskTemplate } from '../types';

type Props = {
  /** Raden arket er åpent for. null = lukket. */
  template: TaskTemplate | null;
  /** Det som er valgt på raden nå: en endring, eller malens egen. */
  current: RoutineRecurrence | null;
  onChoose: (recurrence: RoutineRecurrence) => void;
  onClose: () => void;
};

const OTHER = 'other';
/** Andelen av skjermhøyden velgeren i «Annet …» kan bruke. Resten er tittel og knapper. */
const PICKER_SHARE = 0.55;

/**
 * «Hvor ofte?»: malens hyppighet og trinnene ved siden av (frequencyOptions), og «Annet …» sist.
 * «Annet …» viser samme gjentakelsesvelger som oppgaveskjemaet, bare med det en rutine kan ha.
 */
export function FrequencySheet({ template, current, onChoose, onClose }: Props) {
  return (
    <Sheet visible={template !== null} title="Hvor ofte?" onClose={onClose}>
      {/* key: ny rad = ny tilstand (listen, ikke «Annet …»). */}
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
  const { height } = useWindowDimensions();
  const [today] = useState(() => toIsoDate(new Date()));
  const [form, setForm] = useState<RecurrenceForm | null>(null);

  if (form) {
    const chosen = routineFromSchedule(toRecurrence(form, today));
    return (
      <>
        <Text>{template.title}</Text>
        {/* Sheet ruller ikke, og velgeren kan bli høyere enn skjermen på små telefoner. */}
        <ScrollView style={{ maxHeight: height * PICKER_SHARE }} keyboardShouldPersistTaps="handled">
          <RecurrencePicker value={form} onChange={setForm} today={today} repeatOnly />
        </ScrollView>
        <Button title="Bruk" onPress={() => chosen && onChoose(chosen)} disabled={!chosen} />
        <Button variant="text" title="Tilbake" onPress={() => setForm(null)} />
      </>
    );
  }

  const options = frequencyOptions(template, current);
  const openOther = () =>
    setForm(
      fromRecurrence(
        {
          ...routineRecurrence(current),
          month: null,
          job_repeats: false,
          season_start_month: null,
          season_end_month: null,
          once_on: null,
          next_due_on: null,
        },
        today,
      ),
    );

  return (
    <>
      <Text>{template.title}</Text>
      <ChoiceChips
        options={[
          ...options.map((o) => ({ value: o.key, label: o.label })),
          { value: OTHER, label: 'Annet …' },
        ]}
        value={frequencyKey(current)}
        onChange={(key) => {
          if (key === OTHER) return openOther();
          const option = options.find((o) => o.key === key);
          if (option) onChoose(option.recurrence);
        }}
      />
      <Hint>Det første valget er forslaget. Endringen gjelder bare denne oppgaven.</Hint>
      <Button variant="text" title="Lukk" onPress={onClose} />
    </>
  );
}
