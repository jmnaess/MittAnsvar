import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from './theme';

type Props = {
  title: string;
  /** Kort forklaring under tittelen. */
  description?: string;
  /** Knapp eller tekst til høyre for tittelen. */
  right?: ReactNode;
  children?: ReactNode;
};

/** Seksjon på en side: tittel (20 Fredoka), valgfri forklaring og innhold med 10 px mellom. */
export function Section({ title, description, right, children }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="sectionTitle" accessibilityRole="header" style={styles.title}>{title}</Text>
        {right}
      </View>
      {description && <Text variant="meta" color={colors.textMuted}>{description}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.row },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1 },
});
