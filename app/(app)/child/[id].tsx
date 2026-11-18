import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ChildFields, useChildForm } from '../../../src/features/household/components/ChildForm';
import {
  useDeleteChild,
  useMembers,
  useMyHousehold,
  useUpdateChild,
} from '../../../src/features/household/hooks';
import type { Member } from '../../../src/features/household/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Button, Message, ModalFormScreen } from '../../../src/ui';

export default function EditChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const { data: members, isPending } = useMembers(household!.id);
  const [deleted, setDeleted] = useState(false);

  const child = members?.find((m) => m.id === id && m.role === 'child');

  // Etter sletting hentes listen på nytt før vi går tilbake. Da vises ingenting i stedet for «Fant ikke».
  if (isPending || deleted) return <ModalFormScreen>{null}</ModalFormScreen>;
  if (!child) {
    return (
      <ModalFormScreen>
        <Message tone="muted">Fant ikke barneprofilen. Den kan være slettet.</Message>
      </ModalFormScreen>
    );
  }
  // Skjemaet får startverdiene først når barnet er hentet.
  return (
    <EditChildForm child={child} householdId={household!.id} onDeleted={() => setDeleted(true)} />
  );
}

type FormProps = { child: Member; householdId: string; onDeleted: () => void };

function EditChildForm({ child, householdId, onDeleted }: FormProps) {
  const updateChild = useUpdateChild(householdId);
  const deleteChild = useDeleteChild(householdId);
  const form = useChildForm(child);

  const busy = updateChild.isPending || deleteChild.isPending;
  const error = updateChild.error ?? deleteChild.error;

  function save() {
    if (!form.value) return;
    updateChild.mutate({ memberId: child.id, child: form.value }, { onSuccess: () => router.back() });
  }

  function confirmDelete() {
    Alert.alert(
      `Slette ${child.display_name}?`,
      'Barneprofilen og historikken til barnet slettes. Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: () =>
            deleteChild.mutate(child.id, {
              onSuccess: () => {
                onDeleted();
                router.back();
              },
            }),
        },
      ],
    );
  }

  return (
    <ModalFormScreen canSave={!!form.value} saving={busy} onSave={save}>
      {error && <Message>{toNorwegianMessage(error)}</Message>}
      <ChildFields form={form} disabled={busy} />
      <View style={styles.delete}>
        <Button variant="danger" title="Slett barn" onPress={confirmDelete} disabled={busy} />
      </View>
    </ModalFormScreen>
  );
}

const styles = StyleSheet.create({
  delete: { marginTop: 16 },
});
