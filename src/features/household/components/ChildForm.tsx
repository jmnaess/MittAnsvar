import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../components/theme';
import type { ChildInput } from '../types';
import { AvatarPicker } from './AvatarPicker';

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

/**
 * Tilstanden i barneskjemaet. Skilt fra feltene, så en modal kan ha Lagre i headeren.
 * value er null så lenge skjemaet ikke er gyldig.
 */
export function useChildForm(initial?: ChildInput) {
  const [name, setName] = useState(initial?.display_name ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? 'cat');
  const [birthYearText, setBirthYearText] = useState(initial?.birth_year?.toString() ?? '');

  const trimmedName = name.trim();
  const birthYear = parseBirthYear(birthYearText);
  const value: ChildInput | null =
    trimmedName.length > 0 && birthYear !== undefined
      ? { display_name: trimmedName, avatar, birth_year: birthYear }
      : null;

  return {
    name, setName, avatar, setAvatar, birthYearText, setBirthYearText,
    birthYearInvalid: birthYear === undefined,
    value,
  };
}

export type ChildFormState = ReturnType<typeof useChildForm>;

/** Fornavn, avatar og valgfritt fødselsår. */
export function ChildFields({ form, disabled }: { form: ChildFormState; disabled?: boolean }) {
  const thisYear = new Date().getFullYear();
  return (
    <View style={styles.form}>
      <TextField
        label="Fornavn eller kallenavn"
        value={form.name}
        onChangeText={form.setName}
        maxLength={30}
        autoCapitalize="words"
        editable={!disabled}
      />
      <AvatarPicker value={form.avatar} onChange={form.setAvatar} disabled={disabled} />
      <TextField
        label="Fødselsår (valgfritt)"
        value={form.birthYearText}
        onChangeText={(text) => form.setBirthYearText(text.replace(/\D/g, ''))}
        placeholder={`f.eks. ${thisYear - 8}`}
        keyboardType="number-pad"
        maxLength={4}
        editable={!disabled}
      />
      <Text style={form.birthYearInvalid ? styles.error : styles.hint}>
        {form.birthYearInvalid
          ? `Skriv et årstall mellom ${thisYear - MAX_AGE} og ${thisYear}, eller la feltet stå tomt.`
          : 'Brukes senere til å foreslå oppgaver som passer alderen.'}
      </Text>
    </View>
  );
}

type Props = {
  submitLabel: string;
  busy?: boolean;
  onSubmit: (child: ChildInput) => void;
};

/** Barneskjema med egen knapp. Brukes i oppstarten, som ikke er en modal. */
export function ChildForm({ submitLabel, busy, onSubmit }: Props) {
  const form = useChildForm();
  return (
    <View style={styles.form}>
      <ChildFields form={form} disabled={busy} />
      <Button
        title={submitLabel}
        onPress={() => form.value && onSubmit(form.value)}
        disabled={busy || !form.value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  hint: { fontSize: 13, color: colors.muted, marginTop: -8 },
  error: { fontSize: 13, color: colors.danger, marginTop: -8 },
});
