import { router } from 'expo-router';
import { ChildFields, useChildForm } from '../../../src/features/household/components/ChildForm';
import { useAddChild, useMyHousehold } from '../../../src/features/household/hooks';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Message, ModalFormScreen } from '../../../src/ui';

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
      {addChild.error && <Message>{toNorwegianMessage(addChild.error)}</Message>}
      <ChildFields form={form} disabled={addChild.isPending} />
    </ModalFormScreen>
  );
}
