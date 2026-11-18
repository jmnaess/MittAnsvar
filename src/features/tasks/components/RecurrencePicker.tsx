import { StyleSheet, View } from 'react-native';
import { ChoiceChips, colors, DateField, MultiChoiceChips, Text, TextField } from '../../../ui';
import { MONTH_NAMES } from '../../../lib/dates';
import {
  describeSchedule,
  toRecurrence,
  type CalendarUnit,
  type IntervalUnit,
  type RecurrenceForm,
  type RecurrenceMode,
  type WhenChoice,
} from '../recurrence';

type Props = {
  value: RecurrenceForm;
  onChange: (value: RecurrenceForm) => void;
  /** Enhetens dato, 'YYYY-MM-DD'. I dag og I morgen regnes fra den. */
  today: string;
  disabled?: boolean;
};

const WHEN_OPTIONS: { value: WhenChoice; label: string }[] = [
  { value: 'today', label: 'I dag' },
  { value: 'tomorrow', label: 'I morgen' },
  { value: 'date', label: 'Velg dato' },
  { value: 'repeat', label: 'Gjentas' },
];

const MODE_OPTIONS: { value: RecurrenceMode; label: string }[] = [
  { value: 'calendar', label: 'Fast dag' },
  { value: 'interval', label: 'Etter sist utført' },
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

const ONCE_HINT = 'Vises på dagen og forsvinner når den er gjort.';
const REPEAT_HINTS: Record<RecurrenceMode, string> = {
  calendar: 'Første gang er den første dagen som passer, fra og med i dag.',
  interval: 'Første gang er i dag. Deretter teller vi fra hver gang den blir gjort.',
};

/**
 * «Når?»: i dag, i morgen eller en valgt dato (engangsoppgave), eller «Gjentas» med fast dag
 * i kalenderen eller et intervall etter sist utført. Ledige jobber har sitt eget skjema.
 */
export function RecurrencePicker({ value, onChange, today, disabled }: Props) {
  const set = (changes: Partial<RecurrenceForm>) => onChange({ ...value, ...changes });
  const digitsOnly = (text: string) => text.replace(/\D/g, '');
  const schedule = toRecurrence(value, today);
  const repeats = value.when === 'repeat';

  return (
    <View style={styles.wrapper}>
      <ChoiceChips
        label="Når?"
        options={WHEN_OPTIONS}
        value={value.when}
        onChange={(when) => set({ when })}
        disabled={disabled}
      />

      {value.when === 'date' && (
        <DateField
          label="Dato"
          value={value.date}
          minimumDate={today}
          onChange={(date) => set({ date })}
          disabled={disabled}
        />
      )}

      {repeats && (
        <ChoiceChips
          options={MODE_OPTIONS}
          value={value.mode}
          onChange={(mode) => set({ mode })}
          disabled={disabled}
        />
      )}

      {repeats && value.mode === 'calendar' && (
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

      {repeats && value.mode === 'interval' && (
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

      {schedule && <Text variant="bodyStrong" color={colors.primary}>{describeSchedule(schedule, today)}</Text>}
      <Text variant="hint" color={colors.textMuted}>{repeats ? REPEAT_HINTS[value.mode] : ONCE_HINT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
});
