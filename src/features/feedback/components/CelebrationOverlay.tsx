import * as Haptics from 'expo-haptics';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Celebration } from '../celebration';
import { Confetti } from './Confetti';
import { EmojiBurst } from './EmojiBurst';

type Props = {
  celebration: Celebration;
  member: Pick<Member, 'household_id' | 'avatar' | 'avatar_mode' | 'photo_path' | 'display_name'>;
  /** Familieskjermen: navnet over teksten, så alle ser hvem som gjorde det. */
  showName?: boolean;
  onHide: () => void;
};

const AVATAR_SIZE = 140;
/** «Trykk for å lukke» kommer etter feiringen, så den ikke tar oppmerksomheten. */
const CLOSE_HINT_DELAY_MS = 1000;
/** «Reduser bevegelse»: tekstene tones rolig inn i stedet for å sprette. */
const CALM_FADE_MS = 600;

/**
 * Fullskjermsfeiring for barn etter avkrysning (barnets enhet og familieskjermen). Lukkes ved
 * trykk hvor som helst, eller av seg selv etter celebration.durationMs (etter tekstlengden, se
 * celebrationDurationMs). «Trykk for å lukke» tones inn nederst etter et sekund.
 * Samme glede, ulik smak: med lønn «Ka-ching!» og mynter, uten lønn «❤️-ching!» og hjerter
 * (5 år eller yngre får alltid hjerter). Overskriften leses som «Bra jobba!» av skjermleseren.
 * Animasjon: figuren hopper inn og mynter/hjerter spretter opp. 5 år eller yngre: vrikk i tillegg.
 * Siste for dagen: konfetti i tillegg. Lett haptikk (ikke for de minste).
 * Med «Reduser bevegelse»: ingen sprett eller partikler, bare en rolig inntoning av teksten.
 */
export function CelebrationOverlay({ celebration, member, showName, onHide }: Props) {
  const { personColor } = useTheme();
  const color = personColor(member.avatar);
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const {
    completionId, durationMs, kind, headline, headlineLabel, text, reward,
    particles, particleCount, confetti, haptic, wiggle,
  } = celebration;

  // Som i Toast: nedtellingen starter bare på nytt ved en ny avkrysning, ikke ved hver render.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;
  useEffect(() => {
    const timer = setTimeout(() => onHideRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [completionId, durationMs]);

  // Én lett dunk per avkrysning. Feiler stille der haptikk ikke finnes.
  useEffect(() => {
    if (!haptic) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [completionId, haptic]);

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

  const label = [showName ? member.display_name : null, headlineLabel, text, reward]
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
        {!reduceMotion && (
          <EmojiBurst particles={particles} count={particleCount} color={color.ring} burstKey={completionId} />
        )}
      </View>

      <Animated.View
        key={completionId}
        entering={reduceMotion ? FadeIn.duration(CALM_FADE_MS) : FadeIn.delay(150)}
        style={styles.texts}
      >
        {showName && <Text variant="personName" color={color.ink} style={styles.center}>{member.display_name}</Text>}
        <Text variant="pageTitle" color={color.ink} style={styles.center} accessibilityLabel={headlineLabel}>
          {headline}
        </Text>
        {reward && (
          <Text variant="jobAmount" color={color.ink} style={styles.center}>{reward}</Text>
        )}
        <Text variant={kind === 'day_done' ? 'screenTitle' : 'sectionTitle'} color={color.ink} style={styles.center}>
          {text}
        </Text>
      </Animated.View>

      {/* Med «Reduser bevegelse» står den der fra start, uten inntoning. */}
      <Animated.View
        key={`hint-${completionId}`}
        entering={reduceMotion ? undefined : FadeIn.delay(CLOSE_HINT_DELAY_MS).duration(400)}
        style={[styles.closeHint, { bottom: insets.bottom + spacing.section }]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Text variant="hint" color={color.ink} style={styles.muted}>Trykk for å lukke</Text>
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
  closeHint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  // Dempet: samme farge som resten, men svakere.
  muted: { opacity: 0.65 },
});
