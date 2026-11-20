import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, ChoiceChips, Hint, MultiChoiceChips, TextField } from '../../../ui';
import { MONTH_NAMES } from '../../../lib/dates';
import { useMemberPhotoLookup } from '../../household/hooks';
import type { HouseholdType, Member } from '../../household/types';
import type { CategoryKey } from '../categories';
import { soloMemberId, waitingForSolo, YEARLY_ADULTS_HINT } from '../assignees';
import { toYearlyInputs } from '../yearly';
import { CategoryPicker } from './CategoryPicker';

// ChoiceChips trenger en verdi for «felles». null kan ikke brukes som nøkkel.
const SHARED = 'shared';

const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name.slice(0, 3) }));

/**
 * Tilstanden i «Ny årlig oppgave». value er null så lenge skjemaet ikke er gyldig.
 * Enslig husstand med én person: «Hvem har ansvaret?» skjules, og oppgaven lagres på personen.
 */
export function useYearlyTaskForm(members: Pick<Member, 'id'>[], householdType?: HouseholdType) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(SHARED);
  const [months, setMonths] = useState<number[]>([]);
  // Årshjulet er mest vedlikehold, så det er forhåndsvalgt.
  const [category, setCategory] = useState<CategoryKey>('maintenance');

  const soloId = soloMemberId(householdType, members);
  const value = waitingForSolo(householdType, members)
    ? null
    : toYearlyInputs({
        title,
        assigneeId: soloId ?? (assignee === SHARED ? null : assignee),
        months,
        category,
      });

  return {
    title,
    setTitle,
    assignee,
    setAssignee,
    /** Enslig husstand: «Hvem har ansvaret?» vises ikke. */
    hideAssignee: soloId !== null,
    months,
    setMonths,
    category,
    setCategory,
    value,
  };
}

export type YearlyTaskFormState = ReturnType<typeof useYearlyTaskForm>;

type Props = { form: YearlyTaskFormState; members: Member[]; disabled?: boolean };

/**
 * Det korte skjemaet fra «+» i årshjulet: hva, hvem (voksne eller Felles) og én eller flere
 * måneder. Ingen lønn: årshjul-oppgaver har aldri lønn.
 * Hver måned blir en egen årlig oppgave med hele måneden som frist.
 */
export function YearlyTaskFields({ form, members, disabled }: Props) {
  const photoOf = useMemberPhotoLookup(members[0]?.household_id);
  // Årsoppgaver er mest vedlikehold, så bare voksne (og Felles) kan ha ansvaret.
  const assigneeOptions = [
    { value: SHARED, label: 'Felles', icon: 'people-outline' as const },
    ...members.filter((m) => m.role === 'adult').map((m) => ({
      value: m.id,
      label: m.display_name,
      left: <Avatar avatar={m.avatar} photo={photoOf(m)} size={20} />,
    })),
  ];

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
      {/* Enslig: ingen å velge mellom (se soloMemberId). */}
      {!form.hideAssignee && (
        <>
          <ChoiceChips
            label="Hvem har ansvaret?"
            options={assigneeOptions}
            value={form.assignee}
            onChange={form.setAssignee}
            disabled={disabled}
          />
          {members.some((m) => m.role === 'child') && <Hint>{YEARLY_ADULTS_HINT}</Hint>}
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
