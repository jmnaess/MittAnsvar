import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { spacing } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  title: string;
  /** Liten linje over tittelen, f.eks. datoen. */
  overline?: string;
  /** Knapp eller avatar til høyre. */
  right?: ReactNode;
};

/** Stor sidetittel (38 Fredoka) for skjermer uten navigasjonsheader, som «I dag». */
export function PageHeader({ title, overline, right }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.text}>
        {overline && <Text variant="date" color={colors.textMuted}>{overline}</Text>}
        <Text variant="pageTitle" accessibilityRole="header">{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.page,
    paddingTop: 8,
  },
  text: { flex: 1 },
});
