import { StyleSheet, View } from 'react-native';
import { Avatar, type AvatarPhotoSource, type AvatarSize } from './Avatar';

export type AvatarStackPerson = { avatar: string; photo?: AvatarPhotoSource };

type Props = { people: AvatarStackPerson[]; size?: AvatarSize; max?: number };

/** Avatarer som overlapper (−10 px), f.eks. de som venter på godkjenning. */
export function AvatarStack({ people, size = 32, max = 4 }: Props) {
  return (
    <View style={styles.row}>
      {people.slice(0, max).map((person, i) => (
        <View key={`${person.avatar}-${i}`} style={i > 0 && styles.overlap}>
          <Avatar avatar={person.avatar} photo={person.photo} size={size} outlined />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  overlap: { marginLeft: -10 },
});
