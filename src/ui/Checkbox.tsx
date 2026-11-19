import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { makeStyles } from './makeStyles';
import { useTheme } from './ThemeProvider';

type Props = {
  checked: boolean;
  /** Fyllfarge når avkrysset: personens ring-farge, primary for «Felles». */
  color?: string;
  /** Større sirkel, til familieskjermen. */
  large?: boolean;
};

/** Rund sjekkboks. Bare visning: trykket håndteres av raden rundt. */
export function Checkbox({ checked, color, large }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fill = color ?? colors.primary;
  return (
    <View style={[styles.box, large && styles.large, checked && { backgroundColor: fill, borderColor: fill }]}>
      {checked && <Ionicons name="checkmark" size={large ? 26 : 20} color={colors.onRing} />}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    box: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 2.5,
      borderColor: colors.checkboxBorder,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    large: { width: 38, height: 38, borderRadius: 19 },
  }),
);
