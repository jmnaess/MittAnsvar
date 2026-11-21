import { useEffect, useState } from 'react';
import { Button, Hint, Sheet, TextField } from '../../../ui';
import { formatKroner } from '../../tasks/reward';

/** Samme grenser som add_extra_reward i databasen. */
const MAX_NOK = 10_000;
export const EXTRA_REASON_MAX = 80;

type Props = {
  visible: boolean;
  childName: string;
  saving?: boolean;
  onConfirm: (amountNok: number, reason: string | null) => void;
  onClose: () => void;
};

/**
 * «Legg til ekstra lønn»: beløp (påkrevd) og «Hvorfor?» (frivillig). Går rett inn i saldoen,
 * uten godkjenning, fordi det er en voksen som gir det. Knappene er footer i Sheet.
 */
export function ExtraRewardSheet({ visible, childName, saving, onConfirm, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // Tomt skjema hver gang arket åpnes.
  useEffect(() => {
    if (visible) {
      setAmount('');
      setReason('');
    }
  }, [visible]);

  const n = /^\d+$/.test(amount) ? Number(amount) : 0;
  const valid = n >= 1 && n <= MAX_NOK;

  return (
    <Sheet
      visible={visible}
      title={`Ekstra lønn til ${childName}`}
      onClose={onClose}
      footer={
        <>
          <Button
            title="Legg til"
            onPress={() => onConfirm(n, reason.trim() || null)}
            disabled={!valid || saving}
          />
          <Button variant="text" title="Avbryt" onPress={onClose} />
        </>
      }
    >
      <TextField
        label="Beløp (kr)"
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={5}
        editable={!saving}
      />
      {amount !== '' && !valid && (
        <Hint error>{`Beløpet må være mellom 1 og ${formatKroner(MAX_NOK)}.`}</Hint>
      )}
      <TextField
        label="Hvorfor? (frivillig)"
        value={reason}
        onChangeText={setReason}
        placeholder="Ekstra for at du hjalp til"
        maxLength={EXTRA_REASON_MAX}
        editable={!saving}
      />
      <Hint>{`${childName} ser beløpet og teksten. Det legges til saldoen med en gang.`}</Hint>
    </Sheet>
  );
}
