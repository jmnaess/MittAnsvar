import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { contentMaxWidth, radius, spacing } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  children: ReactNode;
  /** Utelatt = bare en melding, uten «Angre». */
  onUndo?: () => void;
  onHide: () => void;
  undoing?: boolean;
  /** Ny verdi starter nedtellingen på nytt (f.eks. en ny avkrysning eller sletting). */
  resetKey: string;
  /** Hvor lenge banneret, og dermed «Angre», vises. */
  visibleMs: number;
};

/** Mørkt banner nederst med innhold og «Angre» (når onUndo er med). Felles for FeedbackToast, UndoToast og NoticeToast. */
export function Toast({ children, onUndo, onHide, undoing, resetKey, visibleMs }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  // onHide er en ny funksjon ved hver render. Med en ref starter nedtellingen bare på nytt
  // når resetKey endres, ikke ved hver render.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    const timer = setTimeout(() => onHideRef.current(), visibleMs);
    return () => clearTimeout(timer);
  }, [resetKey, visibleMs]);

  return (
    // Ytterste lag sentrerer banneret på brede skjermer og slipper trykk gjennom ved siden av det.
    <View style={styles.position} pointerEvents="box-none">
      <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <View style={styles.content}>{children}</View>
        {onUndo && (
          <Pressable
            onPress={onUndo}
            disabled={undoing}
            hitSlop={10}
            accessibilityRole="button"
            style={[styles.undo, undoing && styles.disabled]}
          >
            <Text variant="bodyStrong" color={colors.toastAction}>Angre</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) =>
  StyleSheet.create({
    position: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      alignItems: 'center',
    },
    toast: {
      width: '100%',
      // Samme bredde som kortene i innholdet over.
      maxWidth: contentMaxWidth - 2 * spacing.page,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: radius.card,
      backgroundColor: colors.toastBg,
      shadowColor: shadow.shadowColor,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    content: { flex: 1, gap: 4 },
    undo: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
    disabled: { opacity: 0.5 },
  }),
);
