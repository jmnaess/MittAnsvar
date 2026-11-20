import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toIsoDate } from '../../../lib/dates';
import { Avatar, ChoiceChips, Hint, MultiChoiceChips, TextField } from '../../../ui';
import { useMemberPhotoLookup } from '../../household/hooks';
import type { HouseholdType, Member } from '../../household/types';
import {
  allAdults,
  allowedAssignees,
  hasNoChildren,
  nextAssignees,
  SHARED,
  soloMemberId,
  toTaskInputs,
  waitingForSolo,
  yearlyAdultsHint,
} from '../assignees';
import { type CategoryKey, toCategory } from '../categories';
import { defaultRecurrenceForm, fromRecurrence, sameWhen, toRecurrence } from '../recurrence';
import { MAX_REWARD_NOK, taskReward } from '../reward';
import { taskSection } from '../section';
import type { TaskInput } from '../types';
import { CategoryPicker } from './CategoryPicker';
import { RecurrencePicker } from './RecurrencePicker';

/**
 * En oppgave som endres: det som ble lagret, og fristen (for eldre engangsoppgaver uten dato).
 * Kategorien kommer som tekst fra databasen.
 */
type Initial = Omit<TaskInput, 'category'> & { category: string; next_due_on: string | null };

/**
 * Tilstanden i oppgaveskjemaet. Skilt fra feltene, så modalen kan ha Lagre i headeren.
 * Ekstrajobber har eget skjema (JobForm).
 *
 * Ny oppgave: flere kan velges, og values har én oppgave per valgt person (eller én for
 * «Felles»). Endre oppgave: bare én person, den oppgaven gjelder, og value er den ene.
 * values og value er null så lenge skjemaet ikke er gyldig.
 */
export function useTaskForm(
  members: Member[],
  initial?: Initial,
  /**
   * assignees: ny oppgave, hvem som er forhåndsvalgt (f.eks. fra personfilteret i «Oppgaver»).
   * Standard er «Felles».
   * householdType: «Enslig» med én person skjuler «Hvem har ansvaret?» (se soloMemberId).
   */
  options?: { assignees?: string[]; householdType?: HouseholdType },
) {
  // Enhetens dato når skjemaet åpnes. I dag og I morgen regnes fra den.
  const [today] = useState(() => toIsoDate(new Date()));
  const [initialWhen] = useState(() =>
    initial ? fromRecurrence(initial, today) : defaultRecurrenceForm(today),
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [assignees, setAssignees] = useState<string[]>(() =>
    initial ? [initial.assigned_member_id ?? SHARED] : (options?.assignees ?? [SHARED]),
  );
  const [recurrenceForm, setRecurrenceForm] = useState(initialWhen);
  // Tekst, fordi det skrives i et felt. Tom = ingen lønn.
  const [reward, setReward] = useState(initial?.reward_nok ? String(initial.reward_nok) : '');
  const [category, setCategory] = useState<CategoryKey>(() => toCategory(initial?.category).key);

  const trimmedTitle = title.trim();
  let schedule = toRecurrence(recurrenceForm, today);
  // «Når?» er ikke endret: behold datoen som er lagret. Ellers ville en engangsoppgave fra i går
  // fått ny frist (og en utført blitt åpnet igjen) bare fordi tittelen ble endret.
  if (schedule && initial?.recurrence_type === 'once' && sameWhen(recurrenceForm, initialWhen)) {
    schedule = { ...schedule, once_on: initial.once_on };
  }

  // Blir den en årsoppgave (Årshjul), kan bare voksne og Felles ha den. Unntak: den som allerede
  // har en eksisterende årsoppgave, også om det er et barn.
  const yearly = schedule !== null && taskSection(schedule) === 'year';
  const keepId = initial && taskSection(initial) === 'year' ? initial.assigned_member_id : null;
  // Enslig: en ny oppgave lagres på personen. En oppgave som endres, beholder ansvarlig (valget er
  // skjult og kan ikke endres), så en felles oppgave blir ikke stille gjort om til personens.
  const soloId = soloMemberId(options?.householdType, members);
  const chosen =
    soloId && !initial ? [soloId] : allowedAssignees(assignees, members, { yearly, keepId });
  // Årshjul-oppgaver har aldri lønn (feltet er skjult), uansett ansvarlig.
  const rewardNok = taskReward(reward, { yearly });

  const values: TaskInput[] | null =
    trimmedTitle.length > 0 &&
    schedule &&
    rewardNok !== undefined &&
    !waitingForSolo(options?.householdType, members)
      ? toTaskInputs(
          { title: trimmedTitle, category, job_member_ids: [], reward_nok: rewardNok, ...schedule },
          chosen,
          members,
        )
      : null;

  return {
    today,
    /** Ny oppgave: flervalg. Endre: én person. */
    multiple: !initial,
    title,
    setTitle,
    /** Utvalget slik det lagres (uten barn når oppgaven blir en årsoppgave). */
    assignees: chosen,
    setAssignees,
    /** Enslig husstand: «Hvem har ansvaret?» vises ikke. */
    hideAssignees: soloId !== null,
    /** Oppgaven blir en årsoppgave: bare voksne og Felles (og keepId) kan velges. */
    yearly,
    keepId,
    recurrenceForm,
    setRecurrenceForm,
    reward,
    setReward,
    category,
    setCategory,
    rewardInvalid: rewardNok === undefined,
    values,
    /** Den ene oppgaven når en eksisterende endres. */
    value: values?.[0] ?? null,
  };
}

export type TaskFormState = ReturnType<typeof useTaskForm>;

type Props = {
  form: TaskFormState;
  members: Member[];
  /** «Lønn (kr)» vises bare for voksne, og skjules når alle valgte er voksne. */
  canSetReward: boolean;
  disabled?: boolean;
};

/** Tittel, når, hvem som har ansvaret, kategori og lønn. */
export function TaskFields({ form, members, canSetReward, disabled }: Props) {
  const photoOf = useMemberPhotoLookup(members[0]?.household_id);
  // En årsoppgave er for voksne: barna vises ikke (unntatt et barn som allerede har den).
  const choosable = form.yearly
    ? members.filter((m) => m.role === 'adult' || m.id === form.keepId)
    : members;
  const childrenHidden = choosable.length < members.length;
  const assigneeOptions = [
    { value: SHARED, label: 'Felles', icon: 'people-outline' as const },
    ...choosable.map((m) => ({
      value: m.id,
      label: m.display_name,
      left: <Avatar avatar={m.avatar} photo={photoOf(m)} size={20} />,
    })),
  ];

  // Voksne får aldri lønn, så feltet skjules når alle valgte er voksne. Er noen barn, vises
  // det, og beløpet fjernes på de voksnes oppgaver (toTaskInputs). Årshjul-oppgaver har aldri
  // lønn, så der er feltet alltid skjult (også for et barn som har en årsoppgave fra før).
  // Uten barn i husstanden er feltet også skjult: bare barn får lønn.
  const onlyAdults = allAdults(form.assignees, members);
  const noChildren = hasNoChildren(members);
  const showReward = canSetReward && !onlyAdults && !form.yearly && !noChildren;

  // Tøm beløpet når feltet er skjult, så det ikke lagres i det skjulte.
  // Effekt i stedet for i onChange, så det også gjelder gamle oppgaver og medlemmer som lastes sent.
  const { reward, setReward } = form;
  const hideReward = onlyAdults || form.yearly || noChildren;
  useEffect(() => {
    if (hideReward && reward !== '') setReward('');
  }, [hideReward, reward, setReward]);

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
      <RecurrencePicker
        value={form.recurrenceForm}
        onChange={form.setRecurrenceForm}
        today={form.today}
        disabled={disabled}
      />
      {/* Enslig: ingen å velge mellom (se soloMemberId). */}
      {form.hideAssignees ? null : form.multiple ? (
        <>
          <MultiChoiceChips
            label="Hvem har ansvaret?"
            options={assigneeOptions}
            values={form.assignees}
            onChange={(next) => form.setAssignees(nextAssignees(form.assignees, next))}
            disabled={disabled}
          />
          <Hint>
            {form.assignees.length > 1
              ? `Lager ${form.assignees.length} oppgaver, én til hver. De krysses av hver for seg.`
              : 'Velg én eller flere. Felles betyr at hvem som helst kan gjøre den.'}
          </Hint>
          {childrenHidden && <Hint>{yearlyAdultsHint(members, form.keepId)}</Hint>}
        </>
      ) : (
        <>
          <ChoiceChips
            label="Hvem har ansvaret?"
            options={assigneeOptions}
            value={form.assignees[0]}
            onChange={(id) => form.setAssignees([id])}
            disabled={disabled}
          />
          <Hint>Felles betyr at hvem som helst kan gjøre den.</Hint>
          {childrenHidden && <Hint>{yearlyAdultsHint(members, form.keepId)}</Hint>}
        </>
      )}
      <CategoryPicker value={form.category} onChange={form.setCategory} disabled={disabled} />
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
              : 'Valgfritt. Barnet får beløpet når oppgaven er gjort. Voksne får ikke lønn.'}
          </Hint>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
