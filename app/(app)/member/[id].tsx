import { useLocalSearchParams } from 'expo-router';
import { MemberPhotoSection } from '../../../src/features/household/components/MemberPhotoSection';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { Message, ModalFormScreen } from '../../../src/ui';

/**
 * Profilbilde for en voksen (fra «Husstand»). Barn får det samme i «Endre barn».
 * Bare voksne kommer hit (Stack.Protected i app/(app)/_layout.tsx).
 */
export default function MemberPhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const { data: members, isPending } = useMembers(household!.id);
  const member = members?.find((m) => m.id === id);

  return (
    <ModalFormScreen closeTitle="Lukk">
      {isPending ? null : member ? (
        <MemberPhotoSection member={member} />
      ) : (
        <Message tone="muted">Fant ikke personen. Den kan være fjernet fra husstanden.</Message>
      )}
    </ModalFormScreen>
  );
}
