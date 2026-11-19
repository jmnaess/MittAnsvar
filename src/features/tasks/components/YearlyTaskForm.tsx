import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, ChoiceChips, Hint, MultiChoiceChips, TextField } from '../../../ui';
import { MONTH_NAMES } from '../../../lib/dates';
import { useMemberPhotoLookup } from '../../household/hooks';
import type { Member } from '../../household/types';
import type { CategoryKey } from '../categories';
import { MAX_REWARD_NOK, parseReward } from '../reward';
import { toYearlyInputs } from '../yearly';
import { CategoryPicker } from './CategoryPicker';

// ChoiceChips trenger en verdi for «felles». null kan ikke brukes som nøkkel.
const SHARED = 'shared';

const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name.slice(0, 3) }));

/** Tilstanden i «Ny årlig oppgave». value er null så lenge skjemaet ikke er gyldig. */
export function useYearlyTaskForm() {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(SHARED);
  const [reward, setReward] = useState('');
  const [months, setMonths] = useState<number[]>([]);
  // Årshjulet er mest vedlikehold, så det er forhåndsvalgt.
  const [category, setCategory] = useState<CategoryKey>('maintenance');

  const value = toYearlyInputs({
    title,
    assigneeId: assignee === SHARED ? null : assignee,
    reward,
    months,
    category,
  });

  return {
    title,
    setTitle,
    assignee,
    setAssignee,
    reward,
    setReward,
    months,
    setMonths,
    category,
    setCategory,
    rewardInvalid: parseReward(reward) === undefined,
    value,
  };
}

export type YearlyTaskFormState = ReturnType<typeof useYearlyTaskForm>;

type Props = { form: YearlyTaskFormState; members: Member[]; disabled?: boolean };

/**
 * Det korte skjemaet fra «+» i årshjulet: hva, hvem, valgfri lønn og én eller flere måneder.
 * Hver måned blir en egen årlig oppgave med hele måneden som frist.
 */
export function YearlyTaskFields({ form, members, disabled }: Props) {
  const photoOf = useMemberPhotoLookup(members[0]?.household_id);
  const assigneeOptions = [
    { value: SHARED, label: 'Felles', icon: 'people-outline' as const },
    ...members.map((m) => ({
      value: m.id,
      label: m.display_name,
      left: <Avatar avatar={m.avatar} photo={photoOf(m)} size={20} />,
    })),
  ];

  // Voksne får aldri lønn, så feltet skjules (og tømmes) når en voksen har ansvaret.
  const assigneeIsAdult = members.some((m) => m.id === form.assignee && m.role === 'adult');
  const { reward, setReward } = form;
  useEffect(() => {
    if (assigneeIsAdult && reward !== '') setReward('');
  }, [assigneeIsAdult, reward, setReward]);

  const count = form.months.length;

  return (
    <View style={styles.form}>
      <TextField
        label="Hva skal gjøres?"
        value={form.title}
        onChangeText={form.setTitle}
        placeholder="f.eks. Vaske vinduer"
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
      {!assigneeIsAdult && (
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
          {form.rewardInvalid && <Hint error>{`Lønnen må være mellom 1 og ${MAX_REWARD_NOK} kr.`}</Hint>}
        </>
      )}
      <MultiChoiceChips
        label="Hvilke måneder?"
        options={MONTH_OPTIONS}
        values={form.months}
        onChange={form.setMonths}
        disabled={disabled}
      />
      <Hint>
        {count > 1
          ? `Blir ${count} oppgaver, én i hver måned. Hele måneden er fristen.`
          : 'Hele måneden er fristen. Velg flere måneder for å gjøre den flere ganger i året.'}
      </Hint>
      <CategoryPicker value={form.category} onChange={form.setCategory} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
