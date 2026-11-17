import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChoiceChips } from '../../../components/ChoiceChips';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../components/theme';
import type { Member } from '../../household/types';
import { defaultRecurrenceForm, fromRecurrence, toRecurrence, type RecurrenceForm } from '../recurrence';
import { MAX_REWARD_NOK, parseReward } from '../reward';
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
  // Tekst, fordi det skrives i et felt. Tom = ingen lønn.
  const [reward, setReward] = useState(initial?.reward_nok ? String(initial.reward_nok) : '');

  const trimmedTitle = title.trim();
  const recurrence = toRecurrence(recurrenceForm);
  const rewardNok = parseReward(reward);
  const value: TaskInput | null =
    trimmedTitle.length > 0 && recurrence && rewardNok !== undefined
      ? {
          title: trimmedTitle,
          assigned_member_id: assignee === SHARED ? null : assignee,
          reward_nok: rewardNok,
          ...recurrence,
        }
      : null;

  return {
    title,
    setTitle,
    assignee,
    setAssignee,
    recurrenceForm,
    setRecurrenceForm,
    reward,
    setReward,
    rewardInvalid: rewardNok === undefined,
    value,
  };
}

export type TaskFormState = ReturnType<typeof useTaskForm>;

type Props = {
  form: TaskFormState;
  members: Member[];
  /** «Lønn (kr)» vises bare for voksne. */
  canSetReward: boolean;
  disabled?: boolean;
};

/** Tittel, hvem som har ansvaret, gjentakelse og lønn. */
export function TaskFields({ form, members, canSetReward, disabled }: Props) {
  const isJob = form.recurrenceForm.mode === 'job';
  const children = members.filter((m) => m.role === 'child');
  // Ledige jobber er for barna: enten alle, eller ett bestemt barn.
  const assigneeOptions = isJob
    ? [{ value: SHARED, label: 'Alle barna' }, ...children.map((m) => ({ value: m.id, label: m.display_name }))]
    : [{ value: SHARED, label: 'Felles' }, ...members.map((m) => ({ value: m.id, label: m.display_name }))];

  // Byttes det til jobb mens en voksen er ansvarlig, blir jobben åpen for alle barna.
  function changeRecurrence(next: RecurrenceForm) {
    if (next.mode === 'job' && form.assignee !== SHARED && !children.some((c) => c.id === form.assignee)) {
      form.setAssignee(SHARED);
    }
    form.setRecurrenceForm(next);
  }

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
        label={isJob ? 'Hvem kan ta jobben?' : 'Hvem har ansvaret?'}
        options={assigneeOptions}
        value={form.assignee}
        onChange={form.setAssignee}
        disabled={disabled}
      />
      <Text style={styles.hint}>
        {isJob
          ? 'Alle barna betyr at hvem som helst av dem kan ta jobben.'
          : 'Felles betyr at hvem som helst kan gjøre den.'}
      </Text>
      <RecurrencePicker value={form.recurrenceForm} onChange={changeRecurrence} disabled={disabled} />
      {canSetReward && (
        <>
          <TextField
            label="Lønn (kr)"
            value={form.reward}
            onChangeText={(text) => form.setReward(text.replace(/\D/g, ''))}
            placeholder="Tom = ingen lønn"
            keyboardType="number-pad"
            maxLength={5}
            editable={!disabled}
          />
          <Text style={form.rewardInvalid ? styles.error : styles.hint}>
            {form.rewardInvalid
              ? `Lønnen må være mellom 1 og ${MAX_REWARD_NOK} kr.`
              : 'Barn får beløpet når de gjør oppgaven. Voksne får ikke lønn.'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  hint: { fontSize: 13, color: colors.muted, marginTop: -10 },
  error: { fontSize: 13, color: colors.danger, marginTop: -10 },
});
