import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../ui';

type Props = {
  count: number;
  /** Ny verdi skyter konfettien ut på nytt. */
  burstKey: string;
};

/** Hvor lenge en bit flyr. */
const FLIGHT_MS = 1100;

/**
 * Små biter i personfargene som skytes ut fra midten og tones ut. Vanlige View-er og Reanimated,
 * ingen egne pakker. Legges oppå avataren, sentrert. Slipper trykk gjennom.
 */
export function Confetti({ count, burstKey }: Props) {
  const { personColors } = useTheme();
  const colors = Object.values(personColors).map((c) => c.ring);
  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Piece key={`${burstKey}-${i}`} index={i} count={count} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}

function Piece({ index, count, color }: { index: number; count: number; color: string }) {
  const progress = useSharedValue(0);
  // Faste, men ulike verdier per bit, så det ser tilfeldig ut uten Math.random i render.
  const angle = (index / count) * 2 * Math.PI + (index % 3) * 0.2;
  const distance = 120 + (index % 4) * 25;
  const size = 8 + (index % 3) * 3;
  const round = index % 2 === 0;

  useEffect(() => {
    progress.value = withDelay(
      (index % 4) * 40,
      withTiming(1, { duration: FLIGHT_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [1, 1, 0]),
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      // Litt «tyngdekraft»: bitene faller mot slutten.
      { translateY: Math.sin(angle) * distance * progress.value + 60 * progress.value * progress.value },
      { rotate: `${progress.value * 360}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: size, height: size, borderRadius: round ? size / 2 : 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute' },
});
