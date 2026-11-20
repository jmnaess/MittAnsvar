import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { InfoButton } from './InfoButton';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { minTouch, radius } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  title: string;
  /** Linjer under tittelen, i textMuted. Tomme verdier hoppes over. */
  meta?: (string | null | undefined | false)[] | string;
  /** Til venstre, f.eks. en Avatar. */
  left?: ReactNode;
  /** Til høyre, f.eks. Chip, en dato eller en Switch. */
  right?: ReactNode;
  /** Ved siden av tittelen, f.eks. <Chip label="Egen" />. */
  badge?: ReactNode;
  /** Utelatt = bare visning, uten pil. */
  onPress?: () => void;
  onLongPress?: () => void;
  /** Satt: (i)-ikon etter teksten som åpner «Slik gjør du». Trykk på raden er uendret. */
  onInfoPress?: () => void;
  /**
   * Tom plass med pilens bredde når raden ikke kan trykkes. Brukes i lister der bare noen rader
   * har pil (årshjulet), så (i), bryteren og pilen står på samme sted på alle rader.
   */
  reserveChevron?: boolean;
  /** Raden ligger i et hvitt kort: bruk surfaceMuted som bakgrunn. */
  muted?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Én rad i en liste (Oppgaver, Årshjul, Husstand, historikk): hvit, avrundet, pil når den kan trykkes. */
export function ListRow({
  title, meta, left, right, badge, onPress, onLongPress, onInfoPress, reserveChevron, muted,
  accessibilityLabel, accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const lines = (typeof meta === 'string' ? [meta] : (meta ?? [])).filter(Boolean) as string[];
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.row,
        muted && styles.muted,
        pressed && (muted ? styles.mutedPressed : styles.pressed),
      ]}
    >
      {left}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text variant="rowTitle" style={styles.title}>{title}</Text>
          {badge}
        </View>
        {lines.map((line, i) => (
          <Text key={i} variant="meta" color={colors.textMuted}>{line}</Text>
        ))}
      </View>
      {onInfoPress && <InfoButton onPress={onInfoPress} title={title} />}
      {right}
      {(onPress || reserveChevron) && (
        // Fast bredde, så den tomme plassen er nøyaktig like bred som pilen.
        <View style={styles.chevron}>
          {onPress && <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.textMuted} />}
        </View>
      )}
    </Pressable>
  );
}

const CHEVRON_SIZE = 20;

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: minTouch + 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: radius.row,
      backgroundColor: colors.surface,
    },
    pressed: { backgroundColor: colors.surfaceMuted },
    muted: { backgroundColor: colors.surfaceMuted },
    mutedPressed: { backgroundColor: colors.border },
    text: { flex: 1, gap: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    title: { flexShrink: 1 },
    chevron: { width: CHEVRON_SIZE, alignItems: 'center' },
  }),
);
