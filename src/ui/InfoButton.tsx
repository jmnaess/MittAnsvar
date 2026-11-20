import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';
import { useTheme } from './ThemeProvider';

type Props = {
  onPress: () => void;
  /** Oppgavens tittel, til skjermleseren: «Slik gjør du: Sjekk brannslukkeren». */
  title: string;
  /** Større ikon, til de store radene på familieskjermen. */
  large?: boolean;
};

const SIZE = 20;
const LARGE_SIZE = 26;

/**
 * Lite (i)-ikon i en rad: åpner «Slik gjør du». Et eget Pressable, så trykket ikke også går til
 * raden rundt. hitSlop gir trykkflate på minst 48 px.
 */
export function InfoButton({ onPress, title, large }: Props) {
  const { colors } = useTheme();
  const size = large ? LARGE_SIZE : SIZE;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={(48 - size) / 2}
      accessibilityRole="button"
      accessibilityLabel={`Slik gjør du: ${title}`}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      <Ionicons name="information-circle-outline" size={size} color={colors.textMuted} />
    </Pressable>
  );
}
