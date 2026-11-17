import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../components/theme';
import type { Member } from '../../household/types';
import { toJobInput } from '../job';
import { MAX_REWARD_NOK, parseReward } from '../reward';
import type { Task } from '../types';
import { JobMembersPicker } from './JobMembersPicker';

/** Tilstanden i jobbskjemaet. value er null så lenge skjemaet ikke er gyldig. */
export function useJobForm(initial?: Task) {
  const [title, setTitle] = useState(initial?.title ?? '');
  // Tom = alle barna.
  const [memberIds, setMemberIds] = useState<string[]>(initial?.job_member_ids ?? []);
  const [reward, setReward] = useState(initial?.reward_nok ? String(initial.reward_nok) : '');
  const [repeats, setRepeats] = useState(initial?.job_repeats ?? false);

  const value = toJobInput({ title, memberIds, reward, repeats });

  return {
    title,
    setTitle,
    memberIds,
    setMemberIds,
    reward,
    setReward,
    repeats,
    setRepeats,
    rewardInvalid: parseReward(reward) === undefined,
    value,
  };
}

export type JobFormState = ReturnType<typeof useJobForm>;

type Props = { form: JobFormState; members: Member[]; disabled?: boolean };

/**
 * Det korte skjemaet for ledige jobber: hva, lønn, for hvem og om den kan gjøres flere ganger.
 * Det fulle oppgaveskjemaet (TaskForm) kan også lage jobber.
 */
export function JobFields({ form, members, disabled }: Props) {
  return (
    <View style={styles.form}>
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
      {form.rewardInvalid && (
        <Text style={styles.error}>{`Lønnen må være mellom 1 og ${MAX_REWARD_NOK} kr.`}</Text>
      )}
      <JobMembersPicker
        label="For hvem?"
        members={members}
        value={form.memberIds}
        onChange={form.setMemberIds}
        disabled={disabled}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Kan gjøres flere ganger</Text>
        <Switch
          value={form.repeats}
          onValueChange={form.setRepeats}
          disabled={disabled}
          accessibilityLabel="Kan gjøres flere ganger"
        />
      </View>
      <Text style={styles.hint}>
        {form.repeats
          ? 'Blir liggende under «Ledige jobber» etter at den er gjort.'
          : 'Forsvinner når et barn har gjort den.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  hint: { fontSize: 13, color: colors.muted, marginTop: -10 },
  error: { fontSize: 13, color: colors.danger, marginTop: -10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 16, color: colors.text },
});
