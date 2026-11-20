import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { MemberPhotoSection } from '../../../src/features/household/components/MemberPhotoSection';
import { useMembers, useMyHousehold, useUpdateMemberName } from '../../../src/features/household/hooks';
import type { Member } from '../../../src/features/household/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Button, Message, ModalFormScreen, Section, TextField } from '../../../src/ui';

/**
 * En voksen (fra «Husstand»): eget navn og profilbilde når det er deg selv. En annen voksen:
 * bare visning av bildet eller figuren (databasen stopper også endringer).
 * Barn endres i «Endre barn». Bare voksne kommer hit (Stack.Protected i app/(app)/_layout.tsx).
 */
export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: household } = useMyHousehold();
  const { session } = useSession();
  const { data: members, isPending } = useMembers(household!.id);
  const member = members?.find((m) => m.id === id);
  const isMe = !!member && member.auth_user_id === session?.user.id;

  return (
    <ModalFormScreen closeTitle="Lukk">
      {isPending ? null : member ? (
        <>
          {isMe && <OwnNameSection member={member} />}
          <MemberPhotoSection member={member} readOnly={!isMe} />
        </>
      ) : (
        <Message tone="muted">Fant ikke personen. Den kan være fjernet fra husstanden.</Message>
      )}
    </ModalFormScreen>
  );
}

/** «Navn» med «Lagre navn», som husstandsnavnet i Innstillinger. */
function OwnNameSection({ member }: { member: Member }) {
  const update = useUpdateMemberName(member.household_id);
  const [name, setName] = useState(member.display_name);
  const [saved, setSaved] = useState(false);

  const trimmed = name.trim();
  const changed = trimmed !== member.display_name;

  function save() {
    setSaved(false);
    update.mutate({ memberId: member.id, displayName: trimmed }, { onSuccess: () => setSaved(true) });
  }

  return (
    <Section title="Navnet ditt">
      <TextField
        label="Navn"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setSaved(false);
        }}
        maxLength={30}
        autoCapitalize="words"
        editable={!update.isPending}
      />
      <Button title="Lagre navn" onPress={save} disabled={update.isPending || !changed || trimmed === ''} />
      {saved && <Message tone="success">Navnet er lagret.</Message>}
      {update.error && <Message>{toNorwegianMessage(update.error)}</Message>}
    </Section>
  );
}
