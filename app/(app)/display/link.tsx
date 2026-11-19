import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { LinkCodeCard } from '../../../src/features/devices/components/LinkCodeCard';
import { useCreateDisplayLinkCode, useDisplays } from '../../../src/features/display/hooks';
import { useMyHousehold } from '../../../src/features/household/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Button, Message, ModalFormScreen, Text, useTheme } from '../../../src/ui';

/**
 * «Legg til familieskjerm»: lager en kode med en gang, og viser den som QR-kode og tekst.
 * Listen hentes hvert 3. sekund. Når en ny skjerm dukker opp, vises «Koblet til!».
 */
export default function LinkDisplayScreen() {
  const { colors } = useTheme();
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const create = useCreateDisplayLinkCode(householdId);
  const { mutate } = create;
  const newCode = useCallback(() => mutate(), [mutate]);

  // Skjermene som fantes da modalen ble åpnet. En id utenfor listen er den nye.
  const known = useRef<Set<string> | null>(null);
  const { data: displays } = useDisplays(householdId, {
    pollUntil: (list) => !!known.current && list.some((d) => !known.current!.has(d.id)),
  });
  if (displays && !known.current) known.current = new Set(displays.map((d) => d.id));
  const linked = !!displays && !!known.current && displays.some((d) => !known.current!.has(d.id));

  useEffect(() => newCode(), [newCode]);

  if (linked) {
    return (
      <ModalFormScreen closeTitle="Lukk">
        <Text variant="pageTitle" color={colors.primary}>Koblet til! 🎉</Text>
        <Text>Familieskjermen viser nå dagens oppgaver for hele husstanden.</Text>
        <Button title="Ferdig" onPress={() => router.back()} />
      </ModalFormScreen>
    );
  }

  return (
    <ModalFormScreen closeTitle="Lukk">
      <Text>
        På nettbrettet: åpne MittAnsvar, trykk «Sett opp familieskjerm» og skann koden.
      </Text>

      {create.data && (
        <LinkCodeCard
          code={create.data.code}
          expiresAt={create.data.expiresAt}
          onExpired={() => create.reset()}
        />
      )}

      {!create.data && !create.isPending && !create.error && <Text>Koden er utløpt.</Text>}
      {create.error && <Message>{toNorwegianMessage(create.error)}</Message>}

      <Button variant="secondary" title="Lag ny kode" onPress={newCode} disabled={create.isPending} />
      <Message tone="muted">Koden gjelder i 10 minutter og kan brukes én gang.</Message>
    </ModalFormScreen>
  );
}
