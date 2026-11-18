import { StyleSheet, View } from 'react-native';
import { Avatar, type AvatarSize } from './Avatar';

type Props = { avatars: string[]; size?: AvatarSize; max?: number };

/** Avatarer som overlapper (−10 px), f.eks. de som venter på godkjenning. */
export function AvatarStack({ avatars, size = 32, max = 4 }: Props) {
  return (
    <View style={styles.row}>
      {avatars.slice(0, max).map((avatar, i) => (
        <View key={`${avatar}-${i}`} style={i > 0 && styles.overlap}>
          <Avatar avatar={avatar} size={size} outlined />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  overlap: { marginLeft: -10 },
});
