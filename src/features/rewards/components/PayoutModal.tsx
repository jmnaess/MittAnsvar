import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text } from 'react-native';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../components/theme';
import { formatKroner } from '../../tasks/reward';

type Props = {
  visible: boolean;
  childName: string;
  /** Hele saldoen. Feltet starter med denne, og beløpet kan ikke være større. */
  balance: number;
  saving?: boolean;
  onConfirm: (amountNok: number) => void;
  onClose: () => void;
};

/** «Registrer utbetaling»: beløp (forhåndsutfylt med saldoen), så en bekreftelse. */
export function PayoutModal({ visible, childName, balance, saving, onConfirm, onClose }: Props) {
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Lukk">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Utbetaling til {childName}</Text>
          <TextField
            label="Beløp (kr)"
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            editable={!saving}
          />
          <Text style={valid ? styles.hint : styles.error}>
            {valid
              ? `Saldo: ${formatKroner(balance)}. Selve betalingen gjør dere utenfor appen.`
              : `Beløpet må være mellom 1 og ${formatKroner(balance)}.`}
          </Text>
          <Button title="Registrer utbetaling" onPress={confirm} disabled={!valid || saving} />
          <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>Avbryt</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.background, borderRadius: 12, padding: 20, gap: 12 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
  cancel: { alignItems: 'center', paddingTop: 4 },
  cancelText: { fontSize: 16, color: colors.primary },
});
