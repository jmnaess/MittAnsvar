import { View } from 'react-native';
import Svg from 'react-native-svg';
import { avatarArt, fallbackArt } from './avatarArt';
import { colors } from './theme';

/** Størrelsene designsystemet bruker. */
export type AvatarSize = 22 | 32 | 44 | 48 | 100;

type Props = {
  avatar: string;
  size?: AvatarSize;
  /** Ring rundt avataren (personens ring-farge). Ringen ligger utenpå, med 3 px luft. */
  ring?: string;
  /** Hvit kant, brukes når avatarer overlapper (AvatarStack). */
  outlined?: boolean;
};

const RING_GAP = 3;
const RING_WIDTH = 3;

/** Tegnet avatar. Skjult for skjermlesere: navnet står alltid ved siden av. */
export function Avatar({ avatar, size = 44, ring, outlined }: Props) {
  const art = (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {avatarArt[avatar] ?? fallbackArt}
    </Svg>
  );

  const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

  if (ring) {
    const outer = size + 2 * (RING_GAP + RING_WIDTH);
    return (
      <View
        {...hidden}
        style={{
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: RING_WIDTH,
          borderColor: ring,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {art}
      </View>
    );
  }

  if (outlined) {
    return (
      <View {...hidden} style={{ borderRadius: size, borderWidth: 2, borderColor: colors.surface }}>
        {art}
      </View>
    );
  }

  return <View {...hidden}>{art}</View>;
}
