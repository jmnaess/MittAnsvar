import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../components/theme';

type Props = {
  /** Hva som ble gjort, f.eks. «Søppel». */
  title: string;
  /** Tilbakemeldingen fra serveren. null = ingen tekst passet, vis en standardtekst. */
  message: string | null;
  onUndo: () => void;
  onHide: () => void;
  undoing?: boolean;
  /** Ny verdi (f.eks. completion-id) starter nedtellingen på nytt. */
  resetKey: string;
};

/** Hvor lenge banneret, og dermed «Angre», vises. Serveren tillater angring i 10 minutter. */
const VISIBLE_MS = 6000;

/** Banner nederst etter avkrysning: tilbakemelding og «Angre» i noen sekunder. */
export function FeedbackToast({ title, message, onUndo, onHide, undoing, resetKey }: Props) {
  // onHide er en ny funksjon ved hver render. Med en ref starter nedtellingen bare på nytt
  // når det kommer en ny avkrysning (resetKey), ikke ved hver render.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    const timer = setTimeout(() => onHideRef.current(), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [resetKey]);

  return (
    <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <View style={styles.text}>
        <Text style={styles.done}>✓ {title}</Text>
        <Text style={styles.message}>{message ?? 'Bra jobbet!'}</Text>
      </View>
      <Pressable
        onPress={onUndo}
        disabled={undoing}
        hitSlop={10}
        accessibilityRole="button"
        style={styles.undo}
      >
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
  text: { flex: 1, gap: 4 },
  done: { color: '#9ca3af', fontSize: 14 },
  message: { color: '#fff', fontSize: 16 },
  undo: { paddingHorizontal: 4 },
  undoText: { color: '#93c5fd', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5, color: colors.muted },
});
