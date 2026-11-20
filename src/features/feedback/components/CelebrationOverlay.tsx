import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { spacing, Text, useTheme } from '../../../ui';
import { MemberAvatar } from '../../household/components/MemberAvatar';
import type { Member } from '../../household/types';
import type { Celebration } from '../celebration';
import { Confetti } from './Confetti';

type Props = {
  celebration: Celebration;
  member: Pick<Member, 'household_id' | 'avatar' | 'avatar_mode' | 'photo_path' | 'display_name'>;
  /** Familieskjermen: navnet over teksten, så alle ser hvem som gjorde det. */
  showName?: boolean;
  onHide: () => void;
};

const AVATAR_SIZE = 140;

/**
 * Fullskjermsfeiring for barn etter avkrysning (barnets enhet og familieskjermen). Lukkes ved
 * trykk hvor som helst, eller av seg selv etter celebration.durationMs.
 * Animasjon: figuren hopper inn. 5 år eller yngre: vrikk i tillegg. Siste for dagen: konfetti.
 * Med «Reduser bevegelse» står figuren og teksten stille.
 */
export function CelebrationOverlay({ celebration, member, showName, onHide }: Props) {
  const { personColor } = useTheme();
  const color = personColor(member.avatar);
  const reduceMotion = useReducedMotion();
  const { completionId, durationMs, kind, text, reward, pending, confetti, wiggle } = celebration;

  // Som i Toast: nedtellingen starter bare på nytt ved en ny avkrysning, ikke ved hver render.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;
  useEffect(() => {
    const timer = setTimeout(() => onHideRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [completionId, durationMs]);

  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // Hopp inn: litt for stor, så på plass, og et lite hopp opp.
    scale.value = 0.6;
    scale.value = withSpring(1, { damping: 7, stiffness: 180 });
    lift.value = withSequence(withTiming(-24, { duration: 180 }), withSpring(0, { damping: 6 }));
    if (wiggle) {
      rotate.value = withDelay(
        250,
        withSequence(
          withRepeat(withSequence(withTiming(-10, { duration: 120 }), withTiming(10, { duration: 120 })), 3),
          withTiming(0, { duration: 120 }),
        ),
      );
    }
  }, [completionId, reduceMotion, wiggle, scale, lift, rotate]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const label = [showName ? member.display_name : null, text, reward, pending ? 'Venter på godkjenning' : null]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.fill, { backgroundColor: color.tint }]}
      onPress={onHide}
      accessibilityRole="alert"
      accessibilityLabel={label}
      accessibilityHint="Trykk for å lukke"
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.avatarArea}>
        <Animated.View style={avatarStyle}>
          <MemberAvatar member={member} size={AVATAR_SIZE} ring={color.ring} />
        </Animated.View>
        {!reduceMotion && confetti > 0 && <Confetti count={confetti} burstKey={completionId} />}
      </View>

      <Animated.View
        key={completionId}
        entering={reduceMotion ? undefined : FadeIn.delay(150)}
        style={styles.texts}
      >
        {showName && <Text variant="personName" color={color.ink} style={styles.center}>{member.display_name}</Text>}
        <Text variant={kind === 'day_done' ? 'pageTitle' : 'screenTitle'} color={color.ink} style={styles.center}>
          {text}
        </Text>
        {reward && (
          <Text variant="jobAmount" color={color.ink} style={styles.center}>{reward}</Text>
        )}
        {pending && (
          <Text variant="meta" color={color.ink} style={styles.center}>Venter på godkjenning</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.page,
    gap: spacing.section * 2,
    zIndex: 10,
    elevation: 10,
  },
  // Plass til konfettien rundt avataren.
  avatarArea: { width: AVATAR_SIZE * 2, height: AVATAR_SIZE * 1.6, alignItems: 'center', justifyContent: 'center' },
  texts: { alignItems: 'center', gap: spacing.row, maxWidth: 520 },
  center: { textAlign: 'center' },
});
