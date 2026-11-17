import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/components/theme';
import { ChildForm } from '../../../src/features/household/components/ChildForm';
import {
  useDeleteChild,
  useMembers,
  useMyHousehold,
  useUpdateChild,
} from '../../../src/features/household/hooks';
import type { ChildInput } from '../../../src/features/household/types';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function EditChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { data: members, isPending } = useMembers(householdId);
  const updateChild = useUpdateChild(householdId);
  const deleteChild = useDeleteChild(householdId);

  const child = members?.find((m) => m.id === id && m.role === 'child');
  const busy = updateChild.isPending || deleteChild.isPending;
  const error = updateChild.error ?? deleteChild.error;

  // Etter sletting hentes listen på nytt før vi går tilbake. Da vises ingenting i stedet for «Fant ikke».
  if (isPending || deleteChild.isSuccess) return null;
  if (!child) {
    return (
      <View style={styles.container}>
        <Text>Fant ikke barneprofilen. Den kan være slettet.</Text>
      </View>
    );
  }

  function handleSave(input: ChildInput) {
    updateChild.mutate({ memberId: child!.id, child: input }, { onSuccess: () => router.back() });
  }

  function confirmDelete() {
    Alert.alert(
      `Slette ${child!.display_name}?`,
      'Barneprofilen og historikken til barnet slettes. Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: () => deleteChild.mutate(child!.id, { onSuccess: () => router.back() }),
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ChildForm
        initial={{
          display_name: child.display_name,
          avatar: child.avatar,
          birth_year: child.birth_year,
        }}
        submitLabel="Lagre"
        busy={busy}
        onSubmit={handleSave}
      />
      {error && <Text style={styles.error}>{toNorwegianMessage(error)}</Text>}
      <View style={styles.delete}>
        <Button variant="danger" title="Slett barn" onPress={confirmDelete} disabled={busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  error: { color: colors.danger, fontSize: 15 },
  delete: { marginTop: 16 },
});
