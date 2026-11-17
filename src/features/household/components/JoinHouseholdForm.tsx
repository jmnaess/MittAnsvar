import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import type { AcceptInviteInput } from '../api';
import { INVITE_CODE_LENGTH, normalizeInviteCode } from '../inviteCode';
import { AvatarPicker } from './AvatarPicker';

type Props = {
  busy?: boolean;
  onSubmit: (input: AcceptInviteInput) => void;
};

/** Bli med i en husstand: koden fra en voksen, pluss ditt navn og avatar. */
export function JoinHouseholdForm({ busy, onSubmit }: Props) {
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('fox');

  // Små bokstaver, mellomrom og bindestrek er greit. api.ts normaliserer før sending.
  const canSubmit =
    !busy &&
    normalizeInviteCode(code).length === INVITE_CODE_LENGTH &&
    displayName.trim() !== '';

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ code, displayName: displayName.trim(), avatar });
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Kode"
        value={code}
        onChangeText={setCode}
        placeholder="f.eks. ABCD-EFGH"
        maxLength={20}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        editable={!busy}
      />
      <TextField
        label="Ditt navn"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Fornavn eller kallenavn"
        maxLength={30}
        autoCapitalize="words"
        editable={!busy}
      />
      <AvatarPicker value={avatar} onChange={setAvatar} disabled={busy} />
      <Button title="Bli med" onPress={handleSubmit} disabled={!canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
});
