import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

type Props = {
  /** F.eks. «Slettet: Rense sluk». */
  message: string;
  onUndo: () => void;
  onHide: () => void;
  undoing?: boolean;
  /** Ny verdi starter nedtellingen på nytt (f.eks. når en ny rad slettes). */
  resetKey: string;
};

/** Hvor lenge «Angre» vises. */
const VISIBLE_MS = 5000;

/** Banner nederst med en kort tekst og «Angre» i noen sekunder. Samme utseende som FeedbackToast. */
export function UndoToast({ message, onUndo, onHide, undoing, resetKey }: Props) {
  // Ref, så nedtellingen bare starter på nytt ved ny resetKey, ikke ved hver render.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    const timer = setTimeout(() => onHideRef.current(), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [resetKey]);

  return (
    <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      <Pressable onPress={onUndo} disabled={undoing} hitSlop={10} accessibilityRole="button">
        <Text style={[styles.undoText, undoing && styles.disabled]}>Angre</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  message: { flex: 1, color: '#fff', fontSize: 16 },
  undoText: { color: '#93c5fd', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5, color: colors.muted },
});
