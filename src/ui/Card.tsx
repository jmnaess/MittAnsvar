import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from './theme';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle> };

/** Hvitt kort med myk skygge. */
export function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    gap: spacing.row,
    ...shadow,
  },
});
