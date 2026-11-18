import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Hint, Sheet, TextField } from '../../../ui';
import { formatKroner } from '../../tasks/reward';

type Props = {
  visible: boolean;
  childName: string;
  /** Godkjent saldo. Feltet starter med denne, og beløpet kan ikke være større. */
  balance: number;
  /** Venter på godkjenning, og kan ikke betales ut ennå (steg 10b). */
  pending?: number;
  saving?: boolean;
  onConfirm: (amountNok: number) => void;
  onClose: () => void;
};

/** «Registrer utbetaling»: beløp (forhåndsutfylt med saldoen), så en bekreftelse. */
export function PayoutModal({ visible, childName, balance, pending = 0, saving, onConfirm, onClose }: Props) {
  const [amount, setAmount] = useState(String(balance));

  // Hver gang modalen åpnes: start med hele saldoen.
  useEffect(() => {
    if (visible) setAmount(String(balance));
  }, [visible, balance]);

  const n = /^\d+$/.test(amount) ? Number(amount) : 0;
  const valid = n >= 1 && n <= balance;

  function confirm() {
    Alert.alert(`Registrere utbetaling på ${formatKroner(n)} til ${childName}?`, undefined, [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Registrer', onPress: () => onConfirm(n) },
    ]);
  }

  return (
    <Sheet visible={visible} title={`Utbetaling til ${childName}`} onClose={onClose}>
      <TextField
        label="Beløp (kr)"
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={6}
        editable={!saving}
      />
      <Hint error={!valid}>
        {valid
          ? `Godkjent: ${formatKroner(balance)}. Selve betalingen gjør dere utenfor appen.`
          : `Beløpet må være mellom 1 og ${formatKroner(balance)}.`}
      </Hint>
      {pending > 0 && (
        <Hint>{`${formatKroner(pending)} venter på godkjenning og kan ikke betales ut ennå.`}</Hint>
      )}
      <Button title="Registrer utbetaling" onPress={confirm} disabled={!valid || saving} />
      <Button variant="text" title="Avbryt" onPress={onClose} />
    </Sheet>
  );
}
