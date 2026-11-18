import { useTheme } from './ThemeProvider';
import type { Scheme, Theme } from './theme';

/**
 * Stiler som avhenger av temaet. Lages én gang per tema og gjenbrukes.
 *
 *   const useStyles = makeStyles(({ colors }) =>
 *     StyleSheet.create({ card: { backgroundColor: colors.surface } }),
 *   );
 *   function Card() { const styles = useStyles(); … }
 *
 * Fabrikken kaller StyleSheet.create selv, så stilene typesjekkes som før.
 * Stiler uten farger kan fortsatt ligge i en vanlig StyleSheet.create.
 */
export function makeStyles<T>(factory: (theme: Theme) => T): () => T {
  const cache: Partial<Record<Scheme, T>> = {};
  return function useStyles() {
    const theme = useTheme();
    return (cache[theme.scheme] ??= factory(theme));
  };
}
