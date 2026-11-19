import { StyleSheet, View } from 'react-native';
import { Avatar, type AvatarPhotoSource, type AvatarSize } from './Avatar';
import { avatarStackLayout } from './avatarStackLayout';
import { Text } from './Text';
import { useTheme } from './ThemeProvider';

export type AvatarStackPerson = { avatar: string; photo?: AvatarPhotoSource };

type Props = { people: AvatarStackPerson[]; size?: AvatarSize | 24; max?: number };

/**
 * Avatarer som overlapper (−10 px på 32, mindre på mindre størrelser), f.eks. de som venter på godkjenning.
 * Flere enn max: de første max og en rund «+N» til slutt.
 */
export function AvatarStack({ people, size = 32, max = 4 }: Props) {
  const { colors } = useTheme();
  const overlap = { marginLeft: size >= 32 ? -10 : -Math.round(size * 0.3) };
  const { shown, extra } = avatarStackLayout(people.length, max);
  return (
    <View style={styles.row}>
      {people.slice(0, shown).map((person, i) => (
        <View key={`${person.avatar}-${i}`} style={i > 0 && overlap}>
          <Avatar avatar={person.avatar} photo={person.photo} size={size} outlined />
        </View>
      ))}
      {extra > 0 && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.extra,
            overlap,
            {
              // Avataren har 2 px kant utenpå, så sirkelen blir like stor.
              width: size + 4,
              height: size + 4,
              borderRadius: size,
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.surface,
            },
          ]}
        >
          <Text variant={size >= 32 ? 'label' : 'metaSmall'} color={colors.textMuted}>
            {`+${extra}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  extra: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
