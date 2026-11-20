import Ionicons from '@expo/vector-icons/Ionicons';
import { useBottomTabBarHeight } from 'expo-router/tabs';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ChipIconName } from './ChoiceChip';
import { Text } from './Text';
import { makeStyles } from './makeStyles';
import { ALL_ORIENTATIONS } from './Sheet';
import { fab, radius, spacing } from './theme';
import { useTheme } from './ThemeProvider';

export type AddFabItem = {
  key: string;
  label: string;
  icon: ChipIconName;
  onPress: () => void;
};

/** Enten en meny (rund +), eller en knapp med tekst («+ Ny oppgave») som gjør én ting. */
type Props = { items: AddFabItem[] } | { label: string; onPress: () => void };

/** Morph-tiden. Med «Reduser bevegelse» bare en kort fade. */
const MORPH_MS = 250;
const FADE_MS = 150;
const MENU_MAX_WIDTH = 280;
const ROW_HEIGHT = 52;

/**
 * Flytende pluss nede til høyre, over fanelinjen. Legg den sist i skjermens rot-View.
 * Med label: en bredere knapp med + og tekst, samme høyde og stil, som kjører onPress direkte.
 * Med items: rund knapp. Trykk: knappen vokser og blir en meny (Reanimated), plusstegnet roterer til et kryss og bakgrunnen
 * dempes. Trykk utenfor, på krysset eller tilbakeknappen lukker. Et valg lukker og kjører onPress.
 *
 * Menyen ligger i en Modal, så den dekker fanelinjen og er modal for skjermlesere. Kortet tegnes
 * med samme anker som knappen (høyre kant, fanelinjens høyde + fab.margin), så det starter nøyaktig
 * over knappen. Bare til skjermer i fanene (bruker fanelinjens høyde).
 */
export function AddFab(props: Props) {
  if ('label' in props) return <AddFabButton label={props.label} onPress={props.onPress} />;
  return <AddFabWithMenu items={props.items} />;
}

function AddFabButton({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, styles.extended, pressed && { backgroundColor: colors.primaryPressed }]}
    >
      <Ionicons name="add" size={ICON_SIZE_EXTENDED} color={colors.onPrimary} />
      <Text variant="bodyStrong" color={colors.onPrimary} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function AddFabWithMenu({ items }: { items: AddFabItem[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Legg til"
        accessibilityHint="Åpner en meny med det du kan lage"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.primaryPressed }]}
      >
        <Ionicons name="add" size={ICON_SIZE} color={colors.onPrimary} />
      </Pressable>
      {open && <AddFabMenu items={items} onClose={() => setOpen(false)} />}
    </>
  );
}

const ICON_SIZE = 30;
const ICON_SIZE_EXTENDED = 24;

function AddFabMenu({ items, onClose }: { items: AddFabItem[]; onClose: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: windowWidth } = useWindowDimensions();
  const menuWidth = Math.min(MENU_MAX_WIDTH, windowWidth - 2 * spacing.page);

  // progress: 0 = rund knapp, 1 = åpen meny. fade: hele menyen (brukes bare med «Reduser bevegelse»).
  const progress = useSharedValue(0);
  const fade = useSharedValue(reduceMotion ? 0 : 1);
  const contentHeight = useSharedValue<number>(fab.size);
  const [measured, setMeasured] = useState(false);
  const closing = useRef(false);
  const focusRef = useRef<ComponentRef<typeof View>>(null);

  function onContentLayout(event: LayoutChangeEvent) {
    contentHeight.value = event.nativeEvent.layout.height;
    setMeasured(true);
  }

  // Åpne når innholdet er målt (høyden avhenger av skriftstørrelsen).
  useEffect(() => {
    // Lukket før målingen var ferdig: ikke åpne likevel (det ville avbrutt lukkingen).
    if (!measured || closing.current) return;
    if (reduceMotion) {
      progress.value = 1;
      fade.value = withTiming(1, { duration: FADE_MS });
    } else {
      progress.value = withTiming(1, { duration: MORPH_MS, easing: Easing.out(Easing.cubic) });
    }
    // Skjermleseren: fokus på det første valget.
    const timer = setTimeout(() => {
      if (focusRef.current) AccessibilityInfo.sendAccessibilityEvent(focusRef.current, 'focus');
    }, 100);
    return () => clearTimeout(timer);
  }, [measured, reduceMotion, progress, fade]);

  /** Lukk med animasjonen baklengs. Modalen fjernes når den er ferdig. */
  function close() {
    if (closing.current) return;
    closing.current = true;
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onClose);
    };
    if (reduceMotion) fade.value = withTiming(0, { duration: FADE_MS }, done);
    else progress.value = withTiming(0, { duration: MORPH_MS, easing: Easing.in(Easing.cubic) }, done);
  }

  /** Et valg: lukk med en gang (ingen venting), så åpnes skjemaet. */
  function choose(item: AddFabItem) {
    closing.current = true;
    onClose();
    item.onPress();
  }

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * fade.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    width: interpolate(progress.value, [0, 1], [fab.size, menuWidth]),
    height: interpolate(progress.value, [0, 1], [fab.size, contentHeight.value]),
    borderRadius: interpolate(progress.value, [0, 1], [fab.size / 2, radius.section]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.primary, colors.surface]),
  }));
  const clipStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(progress.value, [0, 1], [fab.size / 2, radius.section]),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));
  // Pluss → kryss: 45 grader, og fargen går fra knappens til menyens (to ikoner som tones over).
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.value * 45}deg` }] }));
  const plusStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const crossStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={ALL_ORIENTATIONS}
      onRequestClose={close}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        {/* Skjermlesere bruker krysset; trykkflaten utenfor er bare for fingre. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} importantForAccessibility="no" />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={[styles.card, { bottom: tabBarHeight + fab.margin }, cardStyle]}
      >
        <Animated.View style={[styles.clip, clipStyle]}>
          {/* Innholdet har fast bredde og ligger nederst til høyre, så det avdekkes mens kortet vokser. */}
          <Animated.View style={[styles.content, { width: menuWidth }, contentStyle]} onLayout={onContentLayout}>
            <Text variant="label" color={colors.textMuted} accessibilityRole="header" style={styles.heading}>
              Hva vil du lage?
            </Text>
            {items.map((item, index) => (
              <Pressable
                key={item.key}
                ref={index === 0 ? focusRef : undefined}
                onPress={() => choose(item)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
              >
                <Ionicons name={item.icon} size={22} color={colors.primary} />
                <Text variant="body">{item.label}</Text>
              </Pressable>
            ))}
            {/* Plass til krysset nederst til høyre. */}
            <View style={styles.closeSpace} />
          </Animated.View>
        </Animated.View>

        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Lukk meny"
          style={styles.close}
        >
          <Animated.View style={iconStyle}>
            <Animated.View style={plusStyle}>
              <Ionicons name="add" size={ICON_SIZE} color={colors.onPrimary} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, crossStyle]}>
              <Ionicons name="add" size={ICON_SIZE} color={colors.text} />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors, shadow }) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      right: spacing.page,
      bottom: fab.margin,
      width: fab.size,
      height: fab.size,
      borderRadius: fab.size / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      ...shadow,
    },
    // Knappen med tekst: samme høyde og runding, bredden følger teksten.
    extended: { width: undefined, flexDirection: 'row', gap: 6, paddingLeft: 16, paddingRight: 20 },
    backdrop: { backgroundColor: colors.backdrop },
    card: { position: 'absolute', right: spacing.page, ...shadow },
    clip: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
    content: { position: 'absolute', right: 0, bottom: 0, padding: spacing.row, gap: 2 },
    heading: { paddingHorizontal: spacing.row, paddingTop: 4, paddingBottom: 6 },
    row: {
      minHeight: ROW_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: spacing.row,
      borderRadius: radius.row,
    },
    closeSpace: { height: fab.size - spacing.row },
    close: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: fab.size,
      height: fab.size,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);
