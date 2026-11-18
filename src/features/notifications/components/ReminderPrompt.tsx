import { useState } from 'react';
import { Button, Sheet, Text } from '../../../ui';
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

  // Lukkes bare med knappene (og tilbakeknappen på Android, som betyr «Ikke nå»).
  if (step === 'blocked') {
    return (
      <Sheet visible={!!pending} title="Varsler er slått av" onClose={() => dismiss.mutate()}>
        <Text>
          Du kan slå dem på i telefonens innstillinger. Etterpå skrur du på påminnelser under
          Innstillinger i appen.
        </Text>
        <Button title="Åpne innstillinger" onPress={() => openAndClose()} />
        <Button variant="text" title="Lukk" onPress={() => dismiss.mutate()} />
      </Sheet>
    );
  }

  return (
    <Sheet visible={!!pending} title="Vil du få beskjed om dagens oppgaver?">
      <Text>
        Vi sender ett kort varsel om morgenen med det som skal gjøres. Du kan endre tidspunktet
        eller slå det av under Innstillinger.
      </Text>
      <Button title="Ja takk" onPress={accept} disabled={step === 'busy'} />
      <Button variant="text" title="Ikke nå" onPress={() => dismiss.mutate()} disabled={step === 'busy'} />
    </Sheet>
  );
}
