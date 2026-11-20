import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, ChoiceChips, TextField } from '../../../ui';
import type { CreateHouseholdInput } from '../api';
import { HOUSEHOLD_TYPE_OPTIONS, HOUSING_TYPE_OPTIONS } from '../labels';
import type { HouseholdType, HousingType } from '../types';
import { AvatarPicker } from './AvatarPicker';

type Props = {
  busy?: boolean;
  /** Det som er lagret, når man går tilbake til steget. Utelatt = tomt skjema. */
  initial?: CreateHouseholdInput;
  /** Utelatt = «Opprett husstand». */
  submitLabel?: string;
  onSubmit: (input: CreateHouseholdInput) => void;
};

/** Oppstartsskjema: husstanden (navn, type, bolig) og deg selv (navn, avatar). */
export function HouseholdForm({ busy, initial, submitLabel = 'Opprett husstand', onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<HouseholdType | null>(initial?.type ?? null);
  const [housingType, setHousingType] = useState<HousingType | null>(initial?.housingType ?? null);
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? 'fox');

  const canSubmit =
    !busy && name.trim() !== '' && displayName.trim() !== '' && type !== null && housingType !== null;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      type: type!,
      housingType: housingType!,
      displayName: displayName.trim(),
      avatar,
    });
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Hva skal husstanden hete?"
        value={name}
        onChangeText={setName}
        placeholder="f.eks. Familien Hansen"
        maxLength={50}
        autoCapitalize="words"
        editable={!busy}
      />
      <ChoiceChips
        label="Hvem bor her?"
        options={HOUSEHOLD_TYPE_OPTIONS}
        value={type}
        onChange={setType}
        disabled={busy}
      />
      <ChoiceChips
        label="Hvordan bor dere?"
        options={HOUSING_TYPE_OPTIONS}
        value={housingType}
        onChange={setHousingType}
        disabled={busy}
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
      <Button title={submitLabel} onPress={handleSubmit} disabled={!canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
});
