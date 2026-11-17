import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ChoiceChips } from '../../../components/ChoiceChips';
import { colors } from '../../../components/theme';
import {
  useEnableReminders,
  usePermission,
  useReminderSettings,
  useSaveReminderSettings,
} from '../hooks';
import type { ReminderScope, ReminderSettings } from '../types';
import { PermissionBlocked } from './PermissionBlocked';

const SCOPE_OPTIONS: { value: ReminderScope; label: string }[] = [
  { value: 'mine', label: 'Mine og felles' },
  { value: 'household', label: 'Hele husstanden' },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Påminnelser i Innstillinger. Gjelder bare denne brukeren på denne telefonen. */
export function ReminderSettingsSection({ userId }: { userId: string }) {
  const { data: settings } = useReminderSettings(userId);
  const save = useSaveReminderSettings(userId);
  const enable = useEnableReminders(userId);
  const { permission, setPermission } = usePermission();

  if (!settings) return null;

  const update = (changes: Partial<ReminderSettings>) => save.mutate({ ...settings, ...changes });

  async function toggle(on: boolean) {
    if (!on) return update({ enabled: false });
    setPermission(await enable());
  }

  // Påslått i appen, men nektet i telefonen: si fra, ellers kommer det aldri noe.
  // Mens tillatelsen leses (null), vises det som er lagret.
  const blocked = permission === 'blocked';
  const on = settings.enabled && (permission === null || permission === 'granted');

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.label}>Daglig påminnelse</Text>
        <Switch
          value={on}
          onValueChange={toggle}
          accessibilityLabel="Daglig påminnelse"
        />
      </View>
      <Text style={styles.muted}>
        Ett varsel om dagen med det som forfaller, og månedsoppgaver den 1. og i siste uke.
        Gjelder bare deg, på denne telefonen.
      </Text>

      {blocked && <PermissionBlocked />}

      {on && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Tidspunkt</Text>
            <TimePicker
              hour={settings.hour}
              minute={settings.minute}
              onChange={(hour, minute) => update({ hour, minute })}
            />
          </View>
          <ChoiceChips
            label="Gjelder"
            options={SCOPE_OPTIONS}
            value={settings.scope}
            onChange={(scope) => update({ scope })}
          />
        </>
      )}
    </View>
  );
}

type TimePickerProps = { hour: number; minute: number; onChange: (hour: number, minute: number) => void };

/** iOS: kompakt velger rett i raden. Android: en knapp som åpner klokkedialogen. */
function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const value = new Date();
  value.setHours(hour, minute, 0, 0);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="time"
        display="compact"
        locale="nb-NO"
        onChange={(_, date) => date && onChange(date.getHours(), date.getMinutes())}
      />
    );
  }

  function open() {
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(date.getHours(), date.getMinutes());
      },
    });
  }

  return (
    <Pressable onPress={open} style={styles.time} accessibilityRole="button">
      <Text style={styles.timeText}>{`${pad(hour)}:${pad(minute)}`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  time: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  timeText: { fontSize: 17, color: colors.text },
});
