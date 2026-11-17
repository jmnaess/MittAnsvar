import { StyleSheet, Text, View } from 'react-native';
import { avatarEmoji } from '../features/household/avatars';

type Props = { avatar: string; size?: number };

/** Viser en innebygd avatar. Foreløpig emoji; nøkkelen i databasen er den samme når vi får illustrasjoner. */
export function Avatar({ avatar, size = 40 }: Props) {
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={{ fontSize: size * 0.6 }}>{avatarEmoji(avatar)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
});
