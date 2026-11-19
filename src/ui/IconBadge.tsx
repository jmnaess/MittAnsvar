import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useTheme } from './ThemeProvider';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Samme størrelser som Avatar, så de kan stå i samme kolonne. */
  size?: 32 | 34 | 36 | 44;
  /** round = sirkel (standard), square = avrundet firkant (gruppeoverskrifter i «Oppgaver»). */
  shape?: 'round' | 'square';
  /** Bakgrunn og ikonfarge. Standard: surfaceMuted og primary. */
  background?: string;
  color?: string;
};

/** Ikon i en rund eller avrundet firkantet flate: kategori i «Oppgaver», og «Felles» der en person ellers har avatar. Bare visning. */
export function IconBadge({ icon, size = 36, shape = 'round', background, color }: Props) {
  const { colors } = useTheme();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'square' ? 10 : size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background ?? colors.surfaceMuted,
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.55)} color={color ?? colors.primary} />
    </View>
  );
}
