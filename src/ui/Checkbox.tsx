import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { colors } from './theme';

type Props = {
  checked: boolean;
  /** Fyllfarge når avkrysset: personens ring-farge, primary for «Felles». */
  color?: string;
};

/** Rund sjekkboks. Bare visning: trykket håndteres av raden rundt. */
export function Checkbox({ checked, color = colors.primary }: Props) {
  return (
    <View style={[styles.box, checked && { backgroundColor: color, borderColor: color }]}>
      {checked && <Ionicons name="checkmark" size={20} color={colors.onPrimary} />}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
