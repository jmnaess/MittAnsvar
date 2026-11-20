import { useState } from 'react';
import { Button, Hint, Sheet, Text } from '../../../ui';
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
 * (repeatOnly), forhåndsutfylt med det som er valgt på raden. «Bruk» og «Avbryt» er footer i
 * Sheet: alltid synlige, også med tastaturet oppe. Velgeren ruller.
 */
export function FrequencySheet({ template, current, onChoose, onClose }: Props) {
  if (!template || !current) return null;
  // key: ny rad = nytt skjema.
  return (
    <FrequencyForm key={template.id} template={template} current={current} onChoose={onChoose} onClose={onClose} />
  );
}

function FrequencyForm({
  template,
  current,
  onChoose,
  onClose,
}: Props & { template: TaskTemplate; current: RoutineRecurrence }) {
  const [today] = useState(() => toIsoDate(new Date()));
  const [form, setForm] = useState(() => routineForm(current, today));
  const chosen = routineFromSchedule(toRecurrence(form, today));

  return (
    <Sheet
      visible
      title="Hvor ofte?"
      onClose={onClose}
      footer={
        <>
          <Button title="Bruk" onPress={() => chosen && onChoose(chosen)} disabled={!chosen} />
          <Button variant="text" title="Avbryt" onPress={onClose} />
        </>
      }
    >
      <Text>{template.title}</Text>
      <RecurrencePicker value={form} onChange={setForm} today={today} repeatOnly />
      <Hint>Endringen gjelder bare denne oppgaven.</Hint>
    </Sheet>
  );
}
