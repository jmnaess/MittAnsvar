import { useEffect, useState } from 'react';
import { Button, DateField, Sheet } from '../../../ui';
import { formatDate } from '../../../lib/dates';
import { postponeChoices } from '../postpone';
import { ROW_ACTION_LABELS, type RowAction } from '../rowActions';

type ButtonVariant = NonNullable<React.ComponentProps<typeof Button>['variant']>;

const VARIANTS: Record<RowAction, ButtonVariant> = {
  postpone: 'primary',
  pickDoer: 'secondary',
  remove: 'danger',
  reassign: 'secondary',
  edit: 'secondary',
  cancel: 'text',
};

type Props = {
  visible: boolean;
  title: string;
  /** Valgene, fra rowActions. */
  actions: RowAction[];
  /** I dag, 'YYYY-MM-DD'. */
  today: string;
  /** «Utsett til» regnes fra denne datoen: i dag, eller fristen for en kommende forekomst. */
  postponeFrom: string;
  onPostpone: (to: string) => void;
  onPickDoer: () => void;
  onRemove: () => void;
  onReassign: () => void;
  onEdit: () => void;
  onClose: () => void;
};

/**
 * Voksen trykker på en oppgaverad i «I dag» eller personvisningen (sirkelen krysser av).
 * Først valgene, og ved «Utsett til …» neste dag, Til helga og Velg dato.
 */
export function TaskRowMenu({
  visible, title, actions, today, postponeFrom, onPostpone, onPickDoer, onRemove, onReassign, onEdit, onClose,
}: Props) {
  const [step, setStep] = useState<'menu' | 'postpone'>('menu');
  const { nextDay, weekend } = postponeChoices(postponeFrom);
  const nextDayLabel = postponeFrom === today ? 'I morgen' : 'En dag senere';
  const [date, setDate] = useState(nextDay);

  // Menyen åpnes: start på valgene igjen.
  useEffect(() => {
    if (visible) {
      setStep('menu');
      setDate(nextDay);
    }
  }, [visible, nextDay]);

  const handlers: Record<RowAction, () => void> = {
    postpone: () => setStep('postpone'),
    pickDoer: onPickDoer,
    remove: onRemove,
    reassign: onReassign,
    edit: onEdit,
    cancel: onClose,
  };

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      {step === 'menu' ? (
        actions.map((action) => (
          <Button
            key={action}
            variant={VARIANTS[action]}
            title={ROW_ACTION_LABELS[action]}
            onPress={handlers[action]}
          />
        ))
      ) : (
        <>
          <Button variant="secondary" title={`${nextDayLabel} (${formatDate(nextDay)})`} onPress={() => onPostpone(nextDay)} />
          {weekend !== nextDay && (
            <Button variant="secondary" title={`Til helga (${formatDate(weekend)})`} onPress={() => onPostpone(weekend)} />
          )}
          <DateField label="Velg dato" value={date} minimumDate={nextDay} onChange={setDate} />
          <Button title={`Utsett til ${formatDate(date)}`} onPress={() => onPostpone(date)} />
          <Button variant="text" title="Tilbake" onPress={() => setStep('menu')} />
        </>
      )}
    </Sheet>
  );
}
