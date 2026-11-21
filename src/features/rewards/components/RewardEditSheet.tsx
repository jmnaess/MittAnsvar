import { useEffect, useState } from 'react';
import { Button, Hint, Sheet, TextField } from '../../../ui';
import { formatKroner } from '../../tasks/reward';

/** Samme grense som set_completion_reward i databasen. */
const MAX_NOK = 10_000;

type Props = {
  /** Avkrysningen som endres. null = arket er lukket. */
  event: { title: string; amount: number } | null;
  saving?: boolean;
  /** Nytt beløp. 0 = ingen lønn. */
  onSave: (amountNok: number) => void;
  /** «Ikke godkjent»: beløpet trekkes, som før. */
  onReject: () => void;
  onClose: () => void;
};

/**
 * «Endre lønn» på en godkjent avkrysning i barnets historikk (bare voksne). Feltet er
 * forhåndsutfylt med beløpet. 0 = ingen lønn, og raden forsvinner da fra historikken.
 * Den som åpner arket, spør om forskudd før beløpet lagres.
 */
export function RewardEditSheet({ event, saving, onSave, onReject, onClose }: Props) {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (event) setAmount(String(event.amount));
  }, [event]);

  const valid = /^\d+$/.test(amount) && Number(amount) <= MAX_NOK;
  const n = valid ? Number(amount) : 0;
  const unchanged = event !== null && n === event.amount;

  return (
    <Sheet
      visible={event !== null}
      title="Endre lønn"
      onClose={onClose}
      footer={
        <>
          <Button title="Lagre" onPress={() => onSave(n)} disabled={!valid || unchanged || saving} />
          <Button variant="text" title="Ikke godkjent" onPress={onReject} disabled={saving} />
          <Button variant="text" title="Avbryt" onPress={onClose} />
        </>
      }
    >
      <TextField
        label={event ? `Lønn for «${event.title}» (kr)` : 'Lønn (kr)'}
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={5}
        editable={!saving}
      />
      <Hint error={amount !== '' && !valid}>
        {amount !== '' && !valid
          ? `Beløpet må være mellom 0 og ${formatKroner(MAX_NOK)}.`
          : '0 = ingen lønn. Raden forsvinner da fra historikken.'}
      </Hint>
    </Sheet>
  );
}
