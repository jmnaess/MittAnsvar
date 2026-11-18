import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChoiceChips, Hint, TextField } from '../../../ui';
import type { Member } from '../../household/types';
import { defaultRecurrenceForm, fromRecurrence, toRecurrence } from '../recurrence';
import { MAX_REWARD_NOK, parseReward } from '../reward';
import type { TaskInput } from '../types';
import { JobMembersPicker } from './JobMembersPicker';
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
  // Bare for jobber: barna som kan ta den. Tom = alle barna.
  const [jobMemberIds, setJobMemberIds] = useState<string[]>(initial?.job_member_ids ?? []);
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
          // Jobber bruker listen over barn, alle andre oppgaver én ansvarlig (eller felles).
          ...(recurrence.recurrence_type === 'job'
            ? { assigned_member_id: null, job_member_ids: jobMemberIds }
            : { assigned_member_id: assignee === SHARED ? null : assignee, job_member_ids: [] }),
          reward_nok: rewardNok,
          ...recurrence,
        }
      : null;

  return {
    title,
    setTitle,
    assignee,
    setAssignee,
    jobMemberIds,
    setJobMemberIds,
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
  /** «Lønn (kr)» vises bare for voksne, og bare når ansvarlig er et barn, «Felles» eller jobb. */
  canSetReward: boolean;
  disabled?: boolean;
};

/** Tittel, hvem som har ansvaret, gjentakelse og lønn. */
export function TaskFields({ form, members, canSetReward, disabled }: Props) {
  const isJob = form.recurrenceForm.mode === 'job';
  const assigneeOptions = [
    { value: SHARED, label: 'Felles' },
    ...members.map((m) => ({ value: m.id, label: m.display_name })),
  ];

  // Voksne får aldri lønn, så feltet skjules når en voksen har ansvaret. Jobber er alltid for barn.
  const assigneeIsAdult = !isJob && members.some((m) => m.id === form.assignee && m.role === 'adult');
  const showReward = canSetReward && !assigneeIsAdult;

  // Tøm beløpet når en voksen blir ansvarlig, så det ikke lagres i det skjulte.
  // Effekt i stedet for i onChange, så det også gjelder gamle oppgaver og medlemmer som lastes sent.
  const { reward, setReward } = form;
  useEffect(() => {
    if (assigneeIsAdult && reward !== '') setReward('');
  }, [assigneeIsAdult, reward, setReward]);

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
      {isJob ? (
        <>
          <JobMembersPicker
            label="Hvem kan ta jobben?"
            members={members}
            value={form.jobMemberIds}
            onChange={form.setJobMemberIds}
            disabled={disabled}
          />
          <Hint>Velg ett eller flere barn, eller alle barna.</Hint>
        </>
      ) : (
        <>
          <ChoiceChips
            label="Hvem har ansvaret?"
            options={assigneeOptions}
            value={form.assignee}
            onChange={form.setAssignee}
            disabled={disabled}
          />
          <Hint>Felles betyr at hvem som helst kan gjøre den.</Hint>
        </>
      )}
      <RecurrencePicker value={form.recurrenceForm} onChange={form.setRecurrenceForm} disabled={disabled} />
      {showReward && (
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
          <Hint error={form.rewardInvalid}>
            {form.rewardInvalid
              ? `Lønnen må være mellom 1 og ${MAX_REWARD_NOK} kr.`
              : 'Barn får beløpet når de gjør oppgaven. Voksne får ikke lønn.'}
          </Hint>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
