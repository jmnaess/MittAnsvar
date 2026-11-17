import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { ModalFormScreen } from '../../../src/components/ModalFormScreen';
import { colors } from '../../../src/components/theme';
import { ChildFields, useChildForm } from '../../../src/features/household/components/ChildForm';
import { useAddChild, useMyHousehold } from '../../../src/features/household/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';

export default function NewChildScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const addChild = useAddChild(household!.id);
  const form = useChildForm();

  function save() {
    if (form.value) addChild.mutate(form.value, { onSuccess: () => router.back() });
  }

  return (
    <ModalFormScreen canSave={!!form.value} saving={addChild.isPending} onSave={save}>
      {addChild.error && <Text style={styles.error}>{toNorwegianMessage(addChild.error)}</Text>}
      <ChildFields form={form} disabled={addChild.isPending} />
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 15 },
});
