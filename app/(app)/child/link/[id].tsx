import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { LinkCodeCard } from '../../../../src/features/devices/components/LinkCodeCard';
import { useCreateLinkCode } from '../../../../src/features/devices/hooks';
import { useMembers, useMyHousehold } from '../../../../src/features/household/hooks';
import { toNorwegianMessage } from '../../../../src/lib/errors';
import { Button, colors, Message, ModalFormScreen, Text } from '../../../../src/ui';

/**
 * «Koble til enhet»: lager en kode med en gang skjermen åpnes, og viser den som QR-kode og tekst.
 * Medlemslisten hentes hvert 3. sekund. Når barnet er koblet, vises «Koblet til!».
 */
export default function LinkDeviceCodeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const create = useCreateLinkCode();
  const { mutate } = create;

  const { data: members } = useMembers(householdId, {
    pollUntil: (list) => !!list.find((m) => m.id === id)?.auth_user_id,
  });
  const child = members?.find((m) => m.id === id && m.role === 'child');
  const linked = !!child?.auth_user_id;

  const newCode = useCallback(() => mutate(id), [mutate, id]);

  // Én kode når barnet er hentet første gang. Ikke hvis barnet allerede er koblet.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !child) return;
    started.current = true;
    if (!child.auth_user_id) newCode();
  }, [child, newCode]);

  if (!child) return <ModalFormScreen closeTitle="Lukk">{null}</ModalFormScreen>;

  if (linked) {
    return (
      <ModalFormScreen closeTitle="Lukk">
        <Text variant="pageTitle" color={colors.primary}>Koblet til! 🎉</Text>
        <Text>
          {child.display_name} kan nå se og krysse av sine oppgaver på sin egen enhet.
        </Text>
        <Button title="Ferdig" onPress={() => router.back()} />
      </ModalFormScreen>
    );
  }

  return (
    <ModalFormScreen closeTitle="Lukk">
      <Text>
        På {child.display_name} sin enhet: åpne MittAnsvar, trykk «Jeg er et barn» og skann koden.
      </Text>

      {create.data && (
        <LinkCodeCard
          code={create.data.code}
          expiresAt={create.data.expiresAt}
          onExpired={() => create.reset()}
        />
      )}

      {!create.data && !create.isPending && !create.error && (
        <Text>Koden er utløpt.</Text>
      )}
      {create.error && <Message>{toNorwegianMessage(create.error)}</Message>}

      <Button
        variant="secondary"
        title="Lag ny kode"
        onPress={newCode}
        disabled={create.isPending}
      />
      <Message tone="muted">Koden gjelder i 10 minutter og kan brukes én gang.</Message>
    </ModalFormScreen>
  );
}
