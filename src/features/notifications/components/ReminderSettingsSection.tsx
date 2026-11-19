import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { ChoiceChips, makeStyles, minTouch, radius, Switch, Text, useTheme } from '../../../ui';
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
  const { colors } = useTheme();
  const styles = useStyles();
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
      <Switch
        label="Daglig påminnelse"
        value={on}
        onValueChange={toggle}
        accessibilityLabel="Daglig påminnelse"
      />
      <Text variant="meta" color={colors.textMuted}>
        Ett varsel om dagen med det som forfaller, og månedsoppgaver den 1. og i siste uke.
        Gjelder bare deg, på denne telefonen.
      </Text>

      {blocked && <PermissionBlocked />}

      {on && (
        <>
          <View style={styles.row}>
            <Text variant="bodyStrong">Tidspunkt</Text>
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
  const { scheme, colors } = useTheme();
  const styles = useStyles();
  const value = new Date();
  value.setHours(hour, minute, 0, 0);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="time"
        display="compact"
        locale="nb-NO"
        themeVariant={scheme}
        accentColor={colors.primary}
        onValueChange={(_, date) => onChange(date.getHours(), date.getMinutes())}
      />
    );
  }

  function open() {
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onValueChange: (_, date) => onChange(date.getHours(), date.getMinutes()),
    });
  }

  return (
    <Pressable
      onPress={open}
      style={styles.time}
      accessibilityRole="button"
      accessibilityLabel={`Tidspunkt ${pad(hour)}:${pad(minute)}. Endre`}
    >
      <Text variant="bodyStrong">{`${pad(hour)}:${pad(minute)}`}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    section: { gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: minTouch },
    time: {
      minHeight: minTouch,
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      borderRadius: radius.button,
      paddingHorizontal: 16,
    },
  }),
);
