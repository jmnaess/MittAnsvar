import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { TextField } from './TextField';
import { makeStyles } from './makeStyles';
import { minTouch, radius, typography } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

const ICON_SPACE = 36;

/** Kompakt søkefelt: TextField med forstørrelsesglass, og en knapp som tømmer feltet når det har tekst. */
export function SearchField({ value, onChangeText, placeholder = 'Søk' }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View>
      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        style={styles.input}
      />
      <View pointerEvents="none" style={styles.icon}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
      </View>
      {value !== '' && (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Tøm søket"
          style={styles.clear}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  input: {
    minHeight: 40,
    paddingVertical: 8,
    paddingLeft: ICON_SPACE,
    paddingRight: minTouch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.search,
    fontFamily: typography.search.fontFamily,
    fontSize: typography.search.fontSize,
  },
  icon: { position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center' },
  clear: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
