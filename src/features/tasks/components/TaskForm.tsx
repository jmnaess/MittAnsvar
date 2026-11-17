import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChoiceChips } from '../../../components/ChoiceChips';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../components/theme';
import type { Member } from '../../household/types';
import { defaultRecurrenceForm, fromRecurrence, toRecurrence } from '../recurrence';
import type { TaskInput } from '../types';
import { RecurrencePicker } from './RecurrencePicker';

// ChoiceChips trenger en verdi for «felles». null kan ikke brukes som nøkkel.
const SHARED = 'shared';

/**
 * Tilstanden i oppgaveskjemaet. Skilt fra feltene, så modalen kan ha Lagre i headeren.
 * value er null så lenge skjemaet ikke er gyldig.
 */
export function useTaskForm(initial?: TaskInput) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [assignee, setAssignee] = useState(initial?.assigned_member_id ?? SHARED);
  const [recurrenceForm, setRecurrenceForm] = useState(
    initial ? fromRecurrence(initial) : defaultRecurrenceForm(),
  );

  const trimmedTitle = title.trim();
  const recurrence = toRecurrence(recurrenceForm);
  const value: TaskInput | null =
    trimmedTitle.length > 0 && recurrence
      ? { title: trimmedTitle, assigned_member_id: assignee === SHARED ? null : assignee, ...recurrence }
      : null;

  return { title, setTitle, assignee, setAssignee, recurrenceForm, setRecurrenceForm, value };
}

export type TaskFormState = ReturnType<typeof useTaskForm>;

type Props = { form: TaskFormState; members: Member[]; disabled?: boolean };

/** Tittel, hvem som har ansvaret og gjentakelse. */
export function TaskFields({ form, members, disabled }: Props) {
  const assigneeOptions = [
    { value: SHARED, label: 'Felles' },
    ...members.map((m) => ({ value: m.id, label: m.display_name })),
  ];

  return (
    <View style={styles.form}>
      <TextField
        label="Hva skal gjøres?"
        value={form.title}
        onChangeText={form.setTitle}
        placeholder="f.eks. Tømme søppel"
        maxLength={80}
        editable={!disabled}
      />
      <ChoiceChips
        label="Hvem har ansvaret?"
        options={assigneeOptions}
        value={form.assignee}
        onChange={form.setAssignee}
        disabled={disabled}
      />
      <Text style={styles.hint}>Felles betyr at hvem som helst kan gjøre den.</Text>
      <RecurrencePicker
        value={form.recurrenceForm}
        onChange={form.setRecurrenceForm}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  hint: { fontSize: 13, color: colors.muted, marginTop: -10 },
});
