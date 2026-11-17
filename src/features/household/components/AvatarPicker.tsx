import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { colors } from '../../../components/theme';
import { AVATAR_KEYS, avatarLabel } from '../avatars';

type Props = {
  value: string;
  onChange: (avatar: string) => void;
  disabled?: boolean;
};

export function AvatarPicker({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Avatar</Text>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {AVATAR_KEYS.map((key) => {
          const selected = key === value;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              disabled={disabled}
              style={[styles.item, selected && styles.selected]}
              accessibilityRole="radio"
              accessibilityLabel={avatarLabel(key)}
              accessibilityState={{ selected }}
            >
              <Avatar avatar={key} size={44} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 15, color: colors.text, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: colors.primary },
});
