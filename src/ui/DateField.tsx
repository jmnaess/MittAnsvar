import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { formatDate, toIsoDate } from '../lib/dates';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { minTouch, radius } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  label?: string;
  /** 'YYYY-MM-DD' */
  value: string;
  onChange: (value: string) => void;
  /** Tidligste dato som kan velges, 'YYYY-MM-DD'. */
  minimumDate?: string;
  disabled?: boolean;
};

/** 'YYYY-MM-DD' → Date ved midnatt i enhetens tidssone (det datovelgeren forventer). */
function toLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Datovelger. iOS: kompakt velger rett i raden. Android: en knapp som åpner kalenderdialogen.
 * Lys/mørk: themeVariant på iOS. Android-dialogen følger Appearance (satt i ThemeProvider).
 * Samme mønster som klokkeslettet i påminnelsene.
 */
export function DateField({ label, value, onChange, minimumDate, disabled }: Props) {
  const { scheme, colors } = useTheme();
  const styles = useStyles();
  const date = toLocalDate(value);
  const min = minimumDate ? toLocalDate(minimumDate) : undefined;

  function open() {
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      minimumDate: min,
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) onChange(toIsoDate(picked));
      },
    });
  }

  return (
    <View style={styles.row}>
      {label && <Text variant="label">{label}</Text>}
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          locale="nb-NO"
          themeVariant={scheme}
          accentColor={colors.primary}
          minimumDate={min}
          disabled={disabled}
          onChange={(_, picked) => picked && onChange(toIsoDate(picked))}
        />
      ) : (
        <Pressable
          onPress={open}
          disabled={disabled}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel={`Dato ${formatDate(value)}. Endre`}
        >
          <Text variant="bodyStrong">{formatDate(value)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: minTouch, gap: 12 },
    button: {
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
