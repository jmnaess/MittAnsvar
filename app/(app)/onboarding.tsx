import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/components/theme';
import type { CreateHouseholdInput } from '../../src/features/household/api';
import { ChildForm } from '../../src/features/household/components/ChildForm';
import { HouseholdForm } from '../../src/features/household/components/HouseholdForm';
import { MemberRow } from '../../src/features/household/components/MemberRow';
import {
  householdKeys,
  useAddChild,
  useCreateHousehold,
  useMembers,
} from '../../src/features/household/hooks';
import type { ChildInput } from '../../src/features/household/types';
import { toNorwegianMessage } from '../../src/lib/errors';

// Oppstart i to trinn på samme skjerm:
//   1. Opprett husstand (alle)
//   2. Legg til barn (bare «Familie med barn», kan hoppes over)
// Når vi er ferdige, henter vi husstanden på nytt. Da bytter app/(app)/_layout.tsx til fanene.
export default function OnboardingScreen() {
  const queryClient = useQueryClient();
  const createHousehold = useCreateHousehold();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  async function finish() {
    setFinishing(true);
    await queryClient.invalidateQueries({ queryKey: householdKeys.mine });
    setFinishing(false); // skjermen er normalt borte nå; dette gjelder hvis hentingen feilet
  }

  function handleCreate(input: CreateHouseholdInput) {
    createHousehold.mutate(input, {
      onSuccess: (id) => (input.type === 'family' ? setHouseholdId(id) : finish()),
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {householdId === null ? (
            <>
              <Text style={styles.title}>Velkommen!</Text>
              <Text style={styles.lead}>
                Fortell litt om husstanden, så tilpasser vi forslagene til dere.
              </Text>
              <HouseholdForm
                busy={createHousehold.isPending || finishing}
                onSubmit={handleCreate}
              />
              {createHousehold.error && (
                <Text style={styles.error}>{toNorwegianMessage(createHousehold.error)}</Text>
              )}
            </>
          ) : (
            <ChildrenStep householdId={householdId} finishing={finishing} onDone={finish} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ChildrenStepProps = { householdId: string; finishing: boolean; onDone: () => void };

function ChildrenStep({ householdId, finishing, onDone }: ChildrenStepProps) {
  const { data: members } = useMembers(householdId);
  const addChild = useAddChild(householdId);
  // Ny key etter hvert barn gir et tomt skjema til neste.
  const [formKey, setFormKey] = useState(0);

  const children = members?.filter((m) => m.role === 'child') ?? [];

  function handleAdd(child: ChildInput) {
    addChild.mutate(child, { onSuccess: () => setFormKey((k) => k + 1) });
  }

  return (
    <>
      <Text style={styles.title}>Legg til barn</Text>
      <Text style={styles.lead}>
        Barn får en profil med fornavn og avatar, ingen e-post eller konto. Du kan også gjøre dette
        senere i Innstillinger.
      </Text>

      {children.length > 0 && (
        <View>
          {children.map((child) => (
            <MemberRow key={child.id} member={child} />
          ))}
        </View>
      )}

      <ChildForm
        key={formKey}
        submitLabel="Legg til barn"
        busy={addChild.isPending || finishing}
        onSubmit={handleAdd}
      />
      {addChild.error && <Text style={styles.error}>{toNorwegianMessage(addChild.error)}</Text>}

      <View style={styles.done}>
        <Button
          variant="outline"
          title={children.length > 0 ? 'Ferdig' : 'Hopp over'}
          onPress={onDone}
          disabled={addChild.isPending || finishing}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  lead: { fontSize: 16, color: '#333' },
  error: { color: colors.danger, fontSize: 15 },
  done: { marginTop: 8 },
});
