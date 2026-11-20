import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Hvor lenge ringen bruker på å fylles til ny verdi. */
const FILL_MS = 600;

type Props = {
  /** Ytre diameter. */
  size: number;
  /** Tykkelsen på ringen. */
  stroke: number;
  /** 0–1. */
  progress: number;
  /** Fyll (personens ring-farge). */
  color: string;
  /** Sporet under fyllet. */
  trackColor: string;
  /** Innhold i midten, f.eks. avataren. */
  children?: ReactNode;
  accessibilityLabel?: string;
  /** Til skjermleseren: «2 av 5». */
  accessibilityValue?: { min: number; max: number; now: number };
};

/**
 * Framgangsring rundt innholdet. Fylles med animasjon når progress endres; med «Reduser
 * bevegelse» settes den med en gang. Starter øverst og går med klokka.
 */
export function ProgressRing({
  size,
  stroke,
  progress,
  color,
  trackColor,
  children,
  accessibilityLabel,
  accessibilityValue,
}: Props) {
  const reduceMotion = useReducedMotion();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const value = useSharedValue(clamped);

  useEffect(() => {
    value.value = reduceMotion ? clamped : withTiming(clamped, { duration: FILL_MS });
  }, [clamped, reduceMotion, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
    // Den runde enden ville vist en prikk ved 0.
    strokeOpacity: value.value > 0.001 ? 1 : 0,
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityValue}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          // Start øverst i stedet for til høyre.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
