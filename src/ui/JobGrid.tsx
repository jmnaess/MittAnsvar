import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { jobColumns } from './jobGrid';
import { spacing } from './theme';

/**
 * Rutenett for JobCard: 1 jobb = full bredde, 2 eller 3 = side om side, 4+ = tre i bredden og
 * videre nedover. Siste rad fylles med tomme plasser, så kortene holder samme bredde.
 */
export function JobGrid({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const columns = jobColumns(items.length);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));

  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`empty-${i}`} style={styles.filler} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.row },
  row: { flexDirection: 'row', gap: spacing.row },
  filler: { flex: 1 },
});
