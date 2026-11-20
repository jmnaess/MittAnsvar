import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import Svg from 'react-native-svg';
import { avatarArtFor } from './avatarArt';
import { useTheme } from './ThemeProvider';

/** Størrelsene designsystemet bruker. */
export type AvatarSize = 22 | 32 | 44 | 48 | 100;

/** Et profilbilde. cacheKey holder bildet i diskcachen selv når den signerte URL-en byttes. */
export type AvatarPhotoSource = { uri: string; cacheKey: string };

type Props = {
  avatar: string;
  /** Profilbilde i stedet for figuren. Lastes det ikke, vises figuren. */
  photo?: AvatarPhotoSource;
  /** En av AvatarSize. FamilyStrip regner ut sin egen ut fra antall og skjermbredde. */
  size?: AvatarSize | (number & {});
  /** Ring rundt avataren (personens ring-farge). Ringen ligger utenpå, med 3 px luft. */
  ring?: string;
  /** Kant i flatefargen, brukes når avatarer overlapper (AvatarStack). */
  outlined?: boolean;
};

const RING_GAP = 3;
const RING_WIDTH = 3;

/** Tegnet avatar eller profilbilde. Skjult for skjermlesere: navnet står alltid ved siden av. */
export function Avatar({ avatar, photo, size = 44, ring, outlined }: Props) {
  const { colors } = useTheme();
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const showPhoto = photo && photo.cacheKey !== failedKey;

  const art = showPhoto ? (
    <Image
      source={{ uri: photo.uri, cacheKey: photo.cacheKey }}
      cachePolicy="disk"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface }}
      contentFit="cover"
      transition={150}
      onError={() => setFailedKey(photo.cacheKey)}
    />
  ) : (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {avatarArtFor(avatar)}
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
