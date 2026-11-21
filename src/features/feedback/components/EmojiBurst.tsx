import Ionicons from '@expo/vector-icons/Ionicons';
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
import { Text, typography } from '../../../ui';
import { RED_HEART, type CelebrationParticles } from '../celebration';

type Props = {
  particles: CelebrationParticles;
  count: number;
  /** Ringfargen til barnet. Brukes på hjerteikonene blant emojiene. */
  color: string;
  /** Ny verdi skyter partiklene ut på nytt. */
  burstKey: string;
};

const COINS = ['🪙', '💰', '💸'];
const HEARTS = [RED_HEART, '🧡', '💛'];
/** Hver fjerde bit er et hjerteikon i barnets farge. */
const ICON_EVERY = 4;

/** Hvor lenge en bit er i lufta. */
const FLIGHT_MS = 1600;

/**
 * Mynter eller hjerter som spretter opp fra avataren og flyter av gårde oppover mens de tones ut.
 * Samme mønster som Confetti: Reanimated, faste verdier per bit (ingen Math.random i render).
 * Slipper trykk gjennom.
 */
export function EmojiBurst({ particles, count, color, burstKey }: Props) {
  const emojis = particles === 'coins' ? COINS : HEARTS;
  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Piece key={`${burstKey}-${i}`} index={i} count={count}>
          {particles === 'hearts' && i % ICON_EVERY === ICON_EVERY - 1 ? (
            <Ionicons name="heart" size={typography.celebrationEmoji.fontSize} color={color} />
          ) : (
            <Text variant="celebrationEmoji">{emojis[i % emojis.length]}</Text>
          )}
        </Piece>
      ))}
    </View>
  );
}

function Piece({ index, count, children }: { index: number; count: number; children: React.ReactNode }) {
  const progress = useSharedValue(0);
  // Spredt i en vifte oppover, fra venstre til høyre, med litt variasjon.
  const spread = count > 1 ? index / (count - 1) - 0.5 : 0;
  const driftX = spread * 260 + ((index % 3) - 1) * 14;
  const rise = 170 + (index % 4) * 30;
  const tilt = ((index % 5) - 2) * 12;

  useEffect(() => {
    progress.value = withDelay(
      (index % 5) * 70,
      withTiming(1, { duration: FLIGHT_MS, easing: Easing.out(Easing.quad) }),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.1, 0.65, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: driftX * p },
        // Sprett: rask opp først, så flyter den videre.
        { translateY: -rise * Math.sqrt(p) },
        { scale: interpolate(p, [0, 0.15, 0.3, 1], [0.3, 1.25, 1, 0.9]) },
        { rotate: `${tilt * p}deg` },
      ],
    };
  });

  return <Animated.View style={[styles.piece, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute' },
});
