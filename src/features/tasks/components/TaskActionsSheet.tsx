import { useEffect, useState } from 'react';
import { Button, DateField, Sheet } from '../../../ui';
import { formatDate } from '../../../lib/dates';
import { postponeChoices } from '../postpone';

type Props = {
  /** Oppgaven det gjelder. null = skjult. */
  taskTitle: string | null;
  /** I dag, 'YYYY-MM-DD'. */
  today: string;
  onPostpone: (to: string) => void;
  /** «Velg hvem som gjorde det»: samme som langt trykk på raden. */
  onPickDoer: () => void;
  onClose: () => void;
};

/**
 * Voksen trykker på raden til en åpen oppgave i «I dag» (sirkelen krysser av).
 * Først valgene, så «Utsett til» med I morgen, Til helga og Velg dato.
 */
export function TaskActionsSheet({ taskTitle, today, onPostpone, onPickDoer, onClose }: Props) {
  const [step, setStep] = useState<'menu' | 'postpone'>('menu');
  const { tomorrow, weekend } = postponeChoices(today);
  const [date, setDate] = useState(tomorrow);

  // Ny oppgave: start på valgene igjen.
  useEffect(() => {
    if (taskTitle !== null) {
      setStep('menu');
      setDate(tomorrow);
    }
  }, [taskTitle, tomorrow]);

  return (
    <Sheet visible={taskTitle !== null} title={taskTitle ?? undefined} onClose={onClose}>
      {step === 'menu' ? (
        <>
          <Button title="Utsett til …" onPress={() => setStep('postpone')} />
          <Button variant="secondary" title="Velg hvem som gjorde det" onPress={onPickDoer} />
          <Button variant="text" title="Avbryt" onPress={onClose} />
        </>
      ) : (
        <>
          <Button variant="secondary" title={`I morgen (${formatDate(tomorrow)})`} onPress={() => onPostpone(tomorrow)} />
          {weekend !== tomorrow && (
            <Button variant="secondary" title={`Til helga (${formatDate(weekend)})`} onPress={() => onPostpone(weekend)} />
          )}
          <DateField label="Velg dato" value={date} minimumDate={tomorrow} onChange={setDate} />
          <Button title={`Utsett til ${formatDate(date)}`} onPress={() => onPostpone(date)} />
          <Button variant="text" title="Tilbake" onPress={() => setStep('menu')} />
        </>
      )}
    </Sheet>
  );
}
