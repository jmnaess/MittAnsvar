import { router } from 'expo-router';
import { Alert } from 'react-native';
import { formatDateTime } from '../../../lib/dates';
import { toNorwegianMessage } from '../../../lib/errors';
import { Button, ListRow, Message, Section } from '../../../ui';
import { useDisplays, useUnlinkDisplay } from '../hooks';

/** «Familieskjerm» under Husstand, bare for voksne: koble til og fra. */
export function DisplaySection({ householdId }: { householdId: string }) {
  const { data: displays, error } = useDisplays(householdId);
  const unlink = useUnlinkDisplay(householdId);

  function confirmUnlink(displayId: string) {
    Alert.alert('Koble fra familieskjermen?', 'Skjermen logges ut, og må kobles til på nytt med en ny kode.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Koble fra', style: 'destructive', onPress: () => unlink.mutate(displayId) },
    ]);
  }

  return (
    <Section
      title="Familieskjerm"
      description="Vis dagens oppgaver for hele husstanden på et nettbrett. Alle som står foran skjermen, kan krysse av. Den kan ikke endre noe annet."
    >
      {displays?.map((display) => (
        <ListRow
          key={display.id}
          title="Familieskjerm"
          meta={`Koblet til ${formatDateTime(display.created_at)}`}
          right={
            <Button
              variant="text"
              small
              title="Koble fra"
              onPress={() => confirmUnlink(display.id)}
              disabled={unlink.isPending}
            />
          }
        />
      ))}
      <Button variant="secondary" title="Legg til familieskjerm" onPress={() => router.push('/display/link')} />
      {error && <Message>{toNorwegianMessage(error)}</Message>}
      {unlink.error && <Message>{toNorwegianMessage(unlink.error)}</Message>}
    </Section>
  );
}
