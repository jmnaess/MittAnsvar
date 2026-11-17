import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../../../../src/components/Button';
import { ModalFormScreen } from '../../../../src/components/ModalFormScreen';
import { colors } from '../../../../src/components/theme';
import { LinkCodeCard } from '../../../../src/features/devices/components/LinkCodeCard';
import { useCreateLinkCode } from '../../../../src/features/devices/hooks';
import { useMembers, useMyHousehold } from '../../../../src/features/household/hooks';
import { toNorwegianMessage } from '../../../../src/lib/errors';

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
        <Text style={styles.done}>Koblet til! 🎉</Text>
        <Text style={styles.text}>
          {child.display_name} kan nå se og krysse av sine oppgaver på sin egen enhet.
        </Text>
        <Button title="Ferdig" onPress={() => router.back()} />
      </ModalFormScreen>
    );
  }

  return (
    <ModalFormScreen closeTitle="Lukk">
      <Text style={styles.text}>
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
        <Text style={styles.text}>Koden er utløpt.</Text>
      )}
      {create.error && <Text style={styles.error}>{toNorwegianMessage(create.error)}</Text>}

      <Button
        variant="outline"
        title="Lag ny kode"
        onPress={newCode}
        disabled={create.isPending}
      />
      <Text style={styles.muted}>Koden gjelder i 10 minutter og kan brukes én gang.</Text>
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 16, color: colors.text },
  done: { fontSize: 24, fontWeight: '700', color: colors.success },
  muted: { fontSize: 14, color: colors.muted },
  error: { color: colors.danger, fontSize: 15 },
});
