import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toIsoDate } from '../../../lib/dates';
import { ChoiceChips, Hint, TextField } from '../../../ui';
import type { Member } from '../../household/types';
import { defaultRecurrenceForm, fromRecurrence, sameWhen, toRecurrence } from '../recurrence';
import { MAX_REWARD_NOK, parseReward } from '../reward';
import type { TaskInput } from '../types';
import { RecurrencePicker } from './RecurrencePicker';

// ChoiceChips trenger en verdi for «felles». null kan ikke brukes som nøkkel.
const SHARED = 'shared';

/** En oppgave som endres: det som ble lagret, og fristen (for eldre engangsoppgaver uten dato). */
type Initial = TaskInput & { next_due_on: string | null };

/**
 * Tilstanden i oppgaveskjemaet. Skilt fra feltene, så modalen kan ha Lagre i headeren.
 * value er null så lenge skjemaet ikke er gyldig. Ledige jobber har eget skjema (JobForm).
 */
export function useTaskForm(initial?: Initial) {
  // Enhetens dato når skjemaet åpnes. I dag og I morgen regnes fra den.
  const [today] = useState(() => toIsoDate(new Date()));
  const [initialWhen] = useState(() =>
    initial ? fromRecurrence(initial, today) : defaultRecurrenceForm(today),
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [assignee, setAssignee] = useState(initial?.assigned_member_id ?? SHARED);
  const [recurrenceForm, setRecurrenceForm] = useState(initialWhen);
  // Tekst, fordi det skrives i et felt. Tom = ingen lønn.
  const [reward, setReward] = useState(initial?.reward_nok ? String(initial.reward_nok) : '');

  const trimmedTitle = title.trim();
  const rewardNok = parseReward(reward);
  let schedule = toRecurrence(recurrenceForm, today);
  // «Når?» er ikke endret: behold datoen som er lagret. Ellers ville en engangsoppgave fra i går
  // fått ny frist (og en utført blitt åpnet igjen) bare fordi tittelen ble endret.
  if (schedule && initial?.recurrence_type === 'once' && sameWhen(recurrenceForm, initialWhen)) {
    schedule = { ...schedule, once_on: initial.once_on };
  }

  const value: TaskInput | null =
    trimmedTitle.length > 0 && schedule && rewardNok !== undefined
      ? {
          title: trimmedTitle,
          assigned_member_id: assignee === SHARED ? null : assignee,
          job_member_ids: [],
          reward_nok: rewardNok,
          ...schedule,
        }
      : null;

  return {
    today,
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
  /** «Lønn (kr)» vises bare for voksne, og bare når ansvarlig er et barn eller «Felles». */
  canSetReward: boolean;
  /** false = uten «Når?» («Oppgave i dag» fra «I dag»). Skjemaet står da på I dag. */
  showWhen?: boolean;
  disabled?: boolean;
};

/** Tittel, hvem som har ansvaret, når og lønn. */
export function TaskFields({ form, members, canSetReward, showWhen = true, disabled }: Props) {
  const assigneeOptions = [
    { value: SHARED, label: 'Felles' },
    ...members.map((m) => ({ value: m.id, label: m.display_name })),
  ];

  // Voksne får aldri lønn, så feltet skjules når en voksen har ansvaret.
  const assigneeIsAdult = members.some((m) => m.id === form.assignee && m.role === 'adult');
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
      {/* «Når?» rett under tittelen. I dag er forhåndsvalgt. */}
      {showWhen && (
        <RecurrencePicker
          value={form.recurrenceForm}
          onChange={form.setRecurrenceForm}
          today={form.today}
          disabled={disabled}
        />
      )}
      <ChoiceChips
        label="Hvem har ansvaret?"
        options={assigneeOptions}
        value={form.assignee}
        onChange={form.setAssignee}
        disabled={disabled}
      />
      <Hint>Felles betyr at hvem som helst kan gjøre den.</Hint>
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
