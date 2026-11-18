import { StyleSheet, View } from 'react-native';
import { ChoiceChips, colors, MultiChoiceChips, Switch, Text, TextField } from '../../../ui';
import { MONTH_NAMES } from '../../../lib/dates';
import {
  describeRecurrence,
  toRecurrence,
  type CalendarUnit,
  type IntervalUnit,
  type RecurrenceForm,
  type RecurrenceMode,
} from '../recurrence';

type Props = {
  value: RecurrenceForm;
  onChange: (value: RecurrenceForm) => void;
  disabled?: boolean;
};

const MODE_OPTIONS: { value: RecurrenceMode; label: string }[] = [
  { value: 'calendar', label: 'Fast dag' },
  { value: 'interval', label: 'Etter sist utført' },
  { value: 'once', label: 'Én gang' },
  { value: 'job', label: 'Ledig jobb' },
];

const CALENDAR_UNIT_OPTIONS: { value: CalendarUnit; label: string }[] = [
  { value: 'week', label: 'Ukedag' },
  { value: 'month', label: 'Dato i måneden' },
  { value: 'year', label: 'Én gang i året' },
];

const WEEKDAY_OPTIONS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map((label, i) => ({
  value: i + 1,
  label,
}));

const WEEK_EVERY_OPTIONS = [
  { value: 'every' as const, label: 'Hver uke' },
  { value: 'other' as const, label: 'Annenhver uke' },
];

const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name.slice(0, 3) }));

const INTERVAL_UNIT_OPTIONS: { value: IntervalUnit; label: string }[] = [
  { value: 'day', label: 'dager' },
  { value: 'week', label: 'uker' },
  { value: 'month', label: 'måneder' },
  { value: 'year', label: 'år' },
];

const HINTS: Record<RecurrenceMode, string> = {
  calendar: 'Første gang er den første dagen som passer, fra og med i dag.',
  interval: 'Første gang er i dag. Deretter teller vi fra hver gang den blir gjort.',
  once: 'Vises i dag og forsvinner når den er gjort.',
  job: 'Uten dato. Ligger under «Ledige jobber» til et barn tar den, og blir aldri forfalt.',
};

/** Velger gjentakelse: fast dag i kalenderen, et intervall etter sist utført, én gang eller ledig jobb. */
export function RecurrencePicker({ value, onChange, disabled }: Props) {
  const set = (changes: Partial<RecurrenceForm>) => onChange({ ...value, ...changes });
  const digitsOnly = (text: string) => text.replace(/\D/g, '');
  const recurrence = toRecurrence(value);

  return (
    <View style={styles.wrapper}>
      <ChoiceChips
        label="Hvor ofte?"
        options={MODE_OPTIONS}
        value={value.mode}
        onChange={(mode) => set({ mode })}
        disabled={disabled}
      />

      {value.mode === 'calendar' && (
        <>
          <ChoiceChips
            options={CALENDAR_UNIT_OPTIONS}
            value={value.calendarUnit}
            onChange={(calendarUnit) => set({ calendarUnit })}
            disabled={disabled}
          />

          {value.calendarUnit === 'week' && (
            <>
              <MultiChoiceChips
                label="Hvilke dager?"
                options={WEEKDAY_OPTIONS}
                values={value.weekdays}
                onChange={(weekdays) => set({ weekdays })}
                disabled={disabled}
              />
              <ChoiceChips
                options={WEEK_EVERY_OPTIONS}
                value={value.everyOtherWeek ? 'other' : 'every'}
                onChange={(v) => set({ everyOtherWeek: v === 'other' })}
                disabled={disabled}
              />
            </>
          )}

          {value.calendarUnit === 'month' && (
            <>
              <TextField
                label="Dag i måneden (1–31)"
                value={value.monthDay}
                onChangeText={(text) => set({ monthDay: digitsOnly(text) })}
                keyboardType="number-pad"
                maxLength={2}
                editable={!disabled}
              />
              <Text variant="hint" color={colors.textMuted}>Den 29.–31. blir siste dag i måneder som er kortere.</Text>
            </>
          )}

          {value.calendarUnit === 'year' && (
            <>
              <ChoiceChips
                label="Måned"
                options={MONTH_OPTIONS}
                value={value.month}
                onChange={(month) => set({ month })}
                disabled={disabled}
              />
              <TextField
                label="Dag (valgfritt)"
                value={value.monthDay}
                onChangeText={(text) => set({ monthDay: digitsOnly(text) })}
                placeholder="Tom = i løpet av måneden"
                keyboardType="number-pad"
                maxLength={2}
                editable={!disabled}
              />
            </>
          )}
        </>
      )}

      {value.mode === 'interval' && (
        <>
          <TextField
            label="Hvor lenge etter sist?"
            value={value.intervalEvery}
            onChangeText={(text) => set({ intervalEvery: digitsOnly(text) })}
            keyboardType="number-pad"
            maxLength={3}
            editable={!disabled}
          />
          <ChoiceChips
            options={INTERVAL_UNIT_OPTIONS}
            value={value.intervalUnit}
            onChange={(intervalUnit) => set({ intervalUnit })}
            disabled={disabled}
          />
        </>
      )}

      {value.mode === 'job' && (
        <Switch
          label="Kan gjøres flere ganger"
          value={value.jobRepeats}
          onValueChange={(jobRepeats) => set({ jobRepeats })}
          disabled={disabled}
          accessibilityLabel="Kan gjøres flere ganger"
        />
      )}

      {recurrence && <Text variant="bodyStrong" color={colors.primary}>{describeRecurrence(recurrence)}</Text>}
      <Text variant="hint" color={colors.textMuted}>{HINTS[value.mode]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
});
