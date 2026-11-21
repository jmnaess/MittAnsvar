import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Hint, Sheet, TextField } from '../../../ui';
import { formatKroner } from '../../tasks/reward';
import { advanceAfter, advanceText } from '../format';

/** Øvre grense for én utbetaling (samme som i record_payout). */
const MAX_NOK = 10_000;

type Props = {
  visible: boolean;
  childName: string;
  /** Godkjent saldo (under 0 = forskudd). Feltet starter med denne når den er over 0. */
  balance: number;
  /** Venter på godkjenning, og kan ikke betales ut ennå (steg 10b). */
  pending?: number;
  saving?: boolean;
  onConfirm: (amountNok: number) => void;
  onClose: () => void;
};

/**
 * «Registrer utbetaling»: beløp (forhåndsutfylt med saldoen), så en bekreftelse. Over saldoen
 * blir det et forskudd, og bekreftelsen sier hvor stort. Knappene er footer i Sheet, så de synes
 * over tastaturet.
 */
export function PayoutModal({ visible, childName, balance, pending = 0, saving, onConfirm, onClose }: Props) {
  const startAmount = balance > 0 ? String(balance) : '';
  const [amount, setAmount] = useState(startAmount);

  // Hver gang modalen åpnes: start med hele saldoen (tomt ved forskudd eller 0).
  useEffect(() => {
    if (visible) setAmount(startAmount);
  }, [visible, startAmount]);

  const n = /^\d+$/.test(amount) ? Number(amount) : 0;
  const valid = n >= 1 && n <= MAX_NOK;

  function confirm() {
    const advance = advanceAfter({ balance_nok: balance, pending_nok: 0 }, n);
    Alert.alert(
      `Registrere utbetaling på ${formatKroner(n)} til ${childName}?`,
      advance === null ? undefined : advanceText(childName, advance, balance < 0),
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Registrer', onPress: () => onConfirm(n) },
      ],
    );
  }

  return (
    <Sheet
      visible={visible}
      title={`Utbetaling til ${childName}`}
      onClose={onClose}
      footer={
        <>
          <Button title="Registrer utbetaling" onPress={confirm} disabled={!valid || saving} />
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
      <Hint error={amount !== '' && !valid}>
        {amount !== '' && !valid
          ? `Beløpet må være mellom 1 og ${formatKroner(MAX_NOK)}.`
          : balance > 0
            ? `Godkjent: ${formatKroner(balance)}. Over dette blir et forskudd. Selve betalingen gjør dere utenfor appen.`
            : 'Alt som betales ut nå, blir et forskudd. Selve betalingen gjør dere utenfor appen.'}
      </Hint>
      {pending > 0 && (
        <Hint>{`${formatKroner(pending)} venter på godkjenning og kan ikke betales ut ennå.`}</Hint>
      )}
    </Sheet>
  );
}
