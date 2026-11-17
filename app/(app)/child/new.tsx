import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from '../../../src/components/theme';
import { ChildForm } from '../../../src/features/household/components/ChildForm';
import { useAddChild, useMyHousehold } from '../../../src/features/household/hooks';
import type { ChildInput } from '../../../src/features/household/types';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function NewChildScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const addChild = useAddChild(household!.id);

  function handleSubmit(child: ChildInput) {
    addChild.mutate(child, { onSuccess: () => router.back() });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ChildForm submitLabel="Legg til" busy={addChild.isPending} onSubmit={handleSubmit} />
      {addChild.error && <Text style={styles.error}>{toNorwegianMessage(addChild.error)}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  error: { color: colors.danger, fontSize: 15 },
});
