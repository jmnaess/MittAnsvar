import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { toNorwegianMessage } from '../../../lib/errors';
import { Button, ChoiceChips, Message, Section, spacing, useTheme } from '../../../ui';
import {
  useRemoveMemberPhoto,
  useSetMemberAvatarMode,
  useUploadMemberPhoto,
} from '../hooks';
import { pickPhoto, type PhotoSource } from '../photoApi';
import { AVATAR_MODE_OPTIONS } from '../photo';
import type { Member } from '../types';
import { MemberAvatar } from './MemberAvatar';

type Props = {
  member: Member;
  /** En annen voksen: bare visning. Bildet og figuren kan bare den voksne selv endre. */
  readOnly?: boolean;
};

/**
 * Profilbilde for et medlem (bare voksne ser denne). Ta eller velg et bilde, bytt mellom figur
 * og bilde, eller fjern bildet. Bildet krympes til 512×512 og lagres uten posisjon (EXIF).
 * readOnly (en annen voksen): bare bildet eller figuren vises. Databasen stopper også endringer.
 */
export function MemberPhotoSection({ member, readOnly = false }: Props) {
  const { personColor } = useTheme();
  const upload = useUploadMemberPhoto(member.household_id);
  const remove = useRemoveMemberPhoto(member.household_id);
  const setMode = useSetMemberAvatarMode(member.household_id);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<unknown>(null);

  const busy = picking || upload.isPending || remove.isPending || setMode.isPending;
  const error = pickError ?? upload.error ?? remove.error ?? setMode.error;
  const hasPhoto = !!member.photo_path;

  async function choose(source: PhotoSource) {
    setPickError(null);
    upload.reset();
    setPicking(true);
    try {
      const localUri = await pickPhoto(source);
      if (localUri) upload.mutate({ member, localUri });
    } catch (e) {
      setPickError(e);
    } finally {
      setPicking(false);
    }
  }

  function confirmRemove() {
    Alert.alert(
      'Fjerne bildet?',
      `Bildet av ${member.display_name} slettes, og figuren vises igjen.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Fjern', style: 'destructive', onPress: () => remove.mutate(member) },
      ],
    );
  }

  if (readOnly) {
    return (
      <Section
        title="Profilbilde"
        description={`Bare ${member.display_name} kan endre bildet og figuren sin.`}
      >
        <View style={styles.preview}>
          <MemberAvatar member={member} size={100} ring={personColor(member.avatar).ring} />
        </View>
      </Section>
    );
  }

  return (
    <Section
      title="Profilbilde"
      description="Bildet vises bare for dem i husstanden. Uten bilde brukes figuren."
    >
      <View style={styles.preview}>
        <MemberAvatar member={member} size={100} ring={personColor(member.avatar).ring} />
      </View>

      {error ? <Message>{toNorwegianMessage(error)}</Message> : null}

      <View style={styles.buttons}>
        <Button variant="secondary" title="Ta bilde" onPress={() => choose('camera')} disabled={busy} />
        <Button
          variant="secondary"
          title="Velg fra bilder"
          onPress={() => choose('library')}
          disabled={busy}
        />
      </View>

      {hasPhoto && (
        <>
          <ChoiceChips
            label="Vis"
            options={AVATAR_MODE_OPTIONS}
            value={member.avatar_mode}
            onChange={(mode) => mode !== member.avatar_mode && setMode.mutate({ memberId: member.id, mode })}
            disabled={busy}
          />
          <Button variant="text" title="Fjern bildet" onPress={confirmRemove} disabled={busy} />
        </>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', paddingVertical: spacing.row },
  buttons: { gap: spacing.row },
});
