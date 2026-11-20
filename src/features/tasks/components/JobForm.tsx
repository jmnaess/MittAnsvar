import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Hint, Switch, Text, TextField, useTheme } from '../../../ui';
import type { Member } from '../../household/types';
import { type CategoryKey, toCategory } from '../categories';
import { toJobInput } from '../job';
import { MAX_REWARD_NOK, parseReward } from '../reward';
import type { Task } from '../types';
import { CategoryPicker } from './CategoryPicker';
import { JobMembersPicker } from './JobMembersPicker';

/** Tilstanden i jobbskjemaet. value er null så lenge skjemaet ikke er gyldig. */
export function useJobForm(initial?: Task) {
  const [title, setTitle] = useState(initial?.title ?? '');
  // Tom = alle barna.
  const [memberIds, setMemberIds] = useState<string[]>(initial?.job_member_ids ?? []);
  const [reward, setReward] = useState(initial?.reward_nok ? String(initial.reward_nok) : '');
  const [repeats, setRepeats] = useState(initial?.job_repeats ?? false);
  const [category, setCategory] = useState<CategoryKey>(() => toCategory(initial?.category).key);

  const value = toJobInput({ title, memberIds, reward, repeats, category });

  return {
    title,
    setTitle,
    memberIds,
    setMemberIds,
    reward,
    setReward,
    repeats,
    setRepeats,
    category,
    setCategory,
    rewardInvalid: parseReward(reward) === undefined,
    value,
  };
}

export type JobFormState = ReturnType<typeof useJobForm>;

type Props = { form: JobFormState; members: Member[]; disabled?: boolean };

/**
 * Det korte skjemaet for ekstrajobber: hva, lønn, for hvem og om den kan gjøres flere ganger.
 * Det fulle oppgaveskjemaet (TaskForm) kan også lage jobber.
 */
export function JobFields({ form, members, disabled }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.form}>
      <Text variant="meta" color={colors.textMuted}>
        Noe utenom det faste. Alle barna ser samme ekstrajobb og samme beløp.
      </Text>
      <TextField
        label="Hva skal gjøres?"
        value={form.title}
        onChangeText={form.setTitle}
        placeholder="f.eks. Henge opp vask"
        maxLength={80}
        editable={!disabled}
      />
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
      <JobMembersPicker
        label="For hvem?"
        members={members}
        value={form.memberIds}
        onChange={form.setMemberIds}
        disabled={disabled}
      />
      <CategoryPicker value={form.category} onChange={form.setCategory} disabled={disabled} />
      <Switch
        label="Kan gjøres flere ganger"
        value={form.repeats}
        onValueChange={form.setRepeats}
        disabled={disabled}
        accessibilityLabel="Kan gjøres flere ganger"
      />
      <Hint>
        {form.repeats
          ? 'Blir liggende under «Ekstrajobber» etter at den er gjort.'
          : 'Forsvinner når et barn har gjort den.'}
      </Hint>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
