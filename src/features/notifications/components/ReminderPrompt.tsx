import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors } from '../../../components/theme';
import { useDismissReminderPrompt, useEnableReminders, useReminderPromptPending } from '../hooks';
import { openSystemSettings } from '../permissions';

type Step = 'ask' | 'busy' | 'blocked';

/**
 * Spørsmålet om påminnelser. Vises én gang, etter at husstanden er opprettet eller brukeren
 * har blitt med (onboarding setter flagget). Systemdialogen vises først når brukeren sier «Ja takk».
 */
export function ReminderPrompt({ userId }: { userId: string }) {
  const { data: pending } = useReminderPromptPending(userId);
  const dismiss = useDismissReminderPrompt(userId);
  const enable = useEnableReminders(userId);
  const [step, setStep] = useState<Step>('ask');

  function openAndClose() {
    dismiss.mutate();
    openSystemSettings();
  }

  async function accept() {
    setStep('busy');
    const permission = await enable().catch(() => 'blocked' as const);
    if (permission === 'granted') dismiss.mutate();
    else setStep('blocked');
  }

  return (
    <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => dismiss.mutate()}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {step === 'blocked' ? (
            <>
              <Text style={styles.title}>Varsler er slått av</Text>
              <Text style={styles.text}>
                Du kan slå dem på i telefonens innstillinger. Etterpå skrur du på påminnelser under
                Innstillinger i appen.
              </Text>
              <Button title="Åpne innstillinger" onPress={() => openAndClose()} />
              <Button variant="link" title="Lukk" onPress={() => dismiss.mutate()} />
            </>
          ) : (
            <>
              <Text style={styles.title}>Vil du få beskjed om dagens oppgaver?</Text>
              <Text style={styles.text}>
                Vi sender ett kort varsel om morgenen med det som skal gjøres. Du kan endre tidspunktet
                eller slå det av under Innstillinger.
              </Text>
              <Button title="Ja takk" onPress={accept} disabled={step === 'busy'} />
              <Button
                variant="link"
                title="Ikke nå"
                onPress={() => dismiss.mutate()}
                disabled={step === 'busy'}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { backgroundColor: colors.background, borderRadius: 12, padding: 20, gap: 12 },
  title: { fontSize: 19, fontWeight: '700', color: colors.text },
  text: { fontSize: 16, color: colors.text },
});
