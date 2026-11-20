import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { AvatarPicker } from '../../../src/features/household/components/AvatarPicker';
import { MemberPhotoSection } from '../../../src/features/household/components/MemberPhotoSection';
import {
  useMembers,
  useMyHousehold,
  useSetMyAvatar,
  useUpdateMemberName,
} from '../../../src/features/household/hooks';
import type { Member } from '../../../src/features/household/types';
import { toNorwegianMessage } from '../../../src/lib/errors';
import { Button, Message, ModalFormScreen, Section, TextField } from '../../../src/ui';

/**
 * En voksen (fra «Husstand», eller «Din profil» i Innstillinger): eget navn, figur og profilbilde
 * når det er deg selv. En annen voksen:
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
          {isMe && <OwnFigureSection member={member} />}
          <MemberPhotoSection member={member} readOnly={!isMe} />
        </>
      ) : (
        <Message tone="muted">Fant ikke personen. Den kan være fjernet fra husstanden.</Message>
      )}
    </ModalFormScreen>
  );
}

/**
 * «Figuren din»: samme velger som i oppstarten. Lagres med en gang, via set_my_avatar (bare egen rad).
 * Figuren bestemmer også fargen din i appen.
 */
function OwnFigureSection({ member }: { member: Member }) {
  const setAvatar = useSetMyAvatar(member.household_id);
  // Vis det som ble trykket mens lagringen pågår.
  const value = setAvatar.isPending && setAvatar.variables ? setAvatar.variables : member.avatar;

  return (
    <Section title="Figuren din" description="Figuren gir deg også din egen farge i appen.">
      <AvatarPicker
        value={value}
        onChange={(avatar) => avatar !== member.avatar && setAvatar.mutate(avatar)}
        disabled={setAvatar.isPending}
      />
      {setAvatar.error && <Message>{toNorwegianMessage(setAvatar.error)}</Message>}
    </Section>
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
