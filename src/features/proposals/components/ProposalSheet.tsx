import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, ChoiceChips, Hint, Message, Sheet, TextField } from '../../../ui';
import { toNorwegianMessage } from '../../../lib/errors';
import { formatKroner } from '../../tasks/reward';
import {
  MAX_PENDING_PROPOSALS,
  MAX_PROPOSAL_TITLE,
  MAX_PROPOSED_NOK,
  parseAmount,
  proposalAction,
  type ProposalActionKind,
} from '../format';

type YesNo = 'yes' | 'no';

const DONE_OPTIONS: { value: YesNo; label: string }[] = [
  { value: 'yes', label: 'Ja' },
  { value: 'no', label: 'Nei, jeg vil gjøre det' },
];

const REWARD_OPTIONS: { value: YesNo; label: string }[] = [
  { value: 'no', label: 'Nei' },
  { value: 'yes', label: 'Ja' },
];

/** Det skjemaet sender. kind avgjør om det blir en oppgave med en gang eller et forslag. */
export type ProposalSubmit = {
  kind: ProposalActionKind;
  title: string;
  isDone: boolean;
  /** Bare for «send». null = «La de voksne foreslå». */
  proposedNok: number | null;
};

type Props = {
  visible: boolean;
  /** Antall forslag som venter. Ved grensen kan barnet ikke sende flere med lønn. */
  pendingCount: number;
  saving?: boolean;
  error?: unknown;
  onSubmit: (input: ProposalSubmit) => void;
  onClose: () => void;
};

const toBool = (v: YesNo | null) => (v === null ? null : v === 'yes');

/**
 * Barnets skjema «Legg inn noe»: hva, er det gjort, og om barnet vil ha lønn (med valgfritt beløp).
 * Uten lønn skjer det med en gang («Legg til» / «Registrer»). Med lønn går det til de voksne
 * («Send til de voksne»). Skjemaet tømmes hver gang det åpnes.
 *
 * Laget for å få plass på en iPhone SE (667 pt): lite luft, og «Avbryt» og handlingen side om
 * side i footer. De står alltid synlige, også med tastaturet oppe.
 */
export function ProposalSheet({ visible, pendingCount, saving, error, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [done, setDone] = useState<YesNo | null>(null);
  const [reward, setReward] = useState<YesNo | null>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setDone(null);
    setReward(null);
    setAmount('');
  }, [visible]);

  const action = proposalAction(toBool(done), toBool(reward));
  // Grensen på 5 som venter gjelder bare forslag med lønn.
  const full = action.kind === 'send' && pendingCount >= MAX_PENDING_PROPOSALS;
  const trimmed = title.trim();
  const parsed = reward === 'yes' ? parseAmount(amount, MAX_PROPOSED_NOK) : 0;
  const amountValid = parsed !== null;
  const canSend = action.kind !== null && !full && trimmed !== '' && amountValid && !saving;

  function send() {
    if (!canSend || action.kind === null) return;
    onSubmit({
      kind: action.kind,
      title: trimmed,
      isDone: done === 'yes',
      proposedNok: action.kind === 'send' && parsed ? parsed : null,
    });
  }

  return (
    <Sheet
      visible={visible}
      title="Legg inn noe"
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button variant="text" title="Avbryt" onPress={onClose} />
          </View>
          <View style={styles.action}>
            <Button title={action.label} onPress={send} disabled={!canSend} />
          </View>
        </View>
      }
    >
      <View style={styles.form}>
        <TextField
          label="Hva har du gjort, eller vil du gjøre?"
          value={title}
          onChangeText={setTitle}
          maxLength={MAX_PROPOSAL_TITLE}
          autoCapitalize="sentences"
          editable={!saving}
        />
        <ChoiceChips label="Er det gjort?" options={DONE_OPTIONS} value={done} onChange={setDone} disabled={saving} />
        <ChoiceChips
          label="Vil du ha lønn for det?"
          options={REWARD_OPTIONS}
          value={reward}
          onChange={setReward}
          disabled={saving}
        />
        {reward === 'yes' &&
          (full ? (
            <Message tone="muted">
              {`Du har ${MAX_PENDING_PROPOSALS} forslag som venter. Vent til en voksen har sett på dem.`}
            </Message>
          ) : (
            <>
              <TextField
                label="Hvor mye?"
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="La de voksne foreslå"
                editable={!saving}
              />
              {!amountValid && <Hint error>{`Maks ${formatKroner(MAX_PROPOSED_NOK)}.`}</Hint>}
            </>
          ))}
        {!!error && <Message>{toNorwegianMessage(error)}</Message>}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // Mindre luft enn arkets standard (12), så alt får plass på en liten iPhone.
  form: { gap: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});
