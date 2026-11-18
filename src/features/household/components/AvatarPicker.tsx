import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, colors, radius, Text } from '../../../ui';
import { AVATAR_KEYS, avatarLabel } from '../avatars';

type Props = {
  value: string;
  onChange: (avatar: string) => void;
  disabled?: boolean;
};

/** Velg avatar i et rutenett med tre kolonner. Valgt figur får en 3 px primary-kant. */
export function AvatarPicker({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text variant="label">Avatar</Text>
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
              <Avatar avatar={key} size={48} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  // Tre kolonner: hver celle er en tredjedel av bredden, avataren sentrert.
  item: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.surface },
});
