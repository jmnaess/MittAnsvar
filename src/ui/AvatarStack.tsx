import { StyleSheet, View } from 'react-native';
import { Avatar, type AvatarPhotoSource, type AvatarSize } from './Avatar';

export type AvatarStackPerson = { avatar: string; photo?: AvatarPhotoSource };

type Props = { people: AvatarStackPerson[]; size?: AvatarSize | 24; max?: number };

/** Avatarer som overlapper (−10 px på 32, mindre på mindre størrelser), f.eks. de som venter på godkjenning. */
export function AvatarStack({ people, size = 32, max = 4 }: Props) {
  const overlap = { marginLeft: size >= 32 ? -10 : -Math.round(size * 0.3) };
  return (
    <View style={styles.row}>
      {people.slice(0, max).map((person, i) => (
        <View key={`${person.avatar}-${i}`} style={i > 0 && overlap}>
          <Avatar avatar={person.avatar} photo={person.photo} size={size} outlined />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
