import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from './ThemeProvider';

/** Tom liste: kort tittel og en forklaring om hva man kan gjøre. */
export function EmptyState({ title, text }: { title: string; text?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text variant="sectionTitle" style={styles.center}>{title}</Text>
      {text && <Text variant="meta" color={colors.textMuted} style={styles.center}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 6, paddingVertical: 24, paddingHorizontal: 12 },
  center: { textAlign: 'center' },
});
