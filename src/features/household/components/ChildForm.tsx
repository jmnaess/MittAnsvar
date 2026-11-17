import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../components/theme';
import type { ChildInput } from '../types';
import { AvatarPicker } from './AvatarPicker';

type Props = {
  initial?: ChildInput;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (child: ChildInput) => void;
};

const MAX_AGE = 20;

/**
 * Tom streng → null (fødselsår er valgfritt). Ellers 4 siffer innenfor rimelig alder.
 * Returnerer undefined når verdien er ugyldig.
 */
export function parseBirthYear(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!/^\d{4}$/.test(trimmed)) return undefined;
  const year = Number(trimmed);
  const thisYear = new Date().getFullYear();
  return year >= thisYear - MAX_AGE && year <= thisYear ? year : undefined;
}

/** Fornavn, avatar og valgfritt fødselsår. Brukes både i oppstarten og i Innstillinger. */
export function ChildForm({ initial, submitLabel, busy, onSubmit }: Props) {
  const [name, setName] = useState(initial?.display_name ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? 'cat');
  const [birthYearText, setBirthYearText] = useState(initial?.birth_year?.toString() ?? '');

  const trimmedName = name.trim();
  const birthYear = parseBirthYear(birthYearText);
  const birthYearInvalid = birthYear === undefined;
  const canSubmit = !busy && trimmedName.length > 0 && !birthYearInvalid;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ display_name: trimmedName, avatar, birth_year: birthYear });
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Fornavn eller kallenavn"
        value={name}
        onChangeText={setName}
        maxLength={30}
        autoCapitalize="words"
        editable={!busy}
      />
      <AvatarPicker value={avatar} onChange={setAvatar} disabled={busy} />
      <TextField
        label="Fødselsår (valgfritt)"
        value={birthYearText}
        onChangeText={(text) => setBirthYearText(text.replace(/\D/g, ''))}
        placeholder={`f.eks. ${new Date().getFullYear() - 8}`}
        keyboardType="number-pad"
        maxLength={4}
        editable={!busy}
      />
      <Text style={birthYearInvalid ? styles.error : styles.hint}>
        {birthYearInvalid
          ? `Skriv et årstall mellom ${new Date().getFullYear() - MAX_AGE} og ${new Date().getFullYear()}, eller la feltet stå tomt.`
          : 'Brukes senere til å foreslå oppgaver som passer alderen.'}
      </Text>
      <Button title={submitLabel} onPress={handleSubmit} disabled={!canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  hint: { fontSize: 13, color: colors.muted, marginTop: -8 },
  error: { fontSize: 13, color: colors.danger, marginTop: -8 },
});
