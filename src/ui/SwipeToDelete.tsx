import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedReaction, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Text } from './Text';
import { colors, radius } from './theme';

type Props = { children: ReactNode; onDelete: () => void };

/** Bredden på «Slett»-knappen ved et kort sveip. */
const ACTION_WIDTH = 88;
/** Hvor langt (andel av radens bredde) man må dra for å slette uten å trykke, som i Mail. */
const FULL_SWIPE_RATIO = 0.55;
/** Brukes før raden er målt. */
const FALLBACK_THRESHOLD = 200;

/**
 * Dra raden mot venstre (react-native-gesture-handler, virker i Expo Go):
 * - kort sveip: «Slett»-knappen vises, og trykk på den sletter.
 * - langt sveip (forbi drøyt halve raden) og slipp: slettes med en gang, som i Mail på iPhone.
 *   Den røde flaten vokser mens man drar, og «Slett» flytter seg med fingeren forbi terskelen.
 * Sletting skjer uten bekreftelse. Det er greit fordi skjermen viser «Angre» etterpå.
 * Krever GestureHandlerRootView rundt appen (app/_layout.tsx).
 */
export function SwipeToDelete({ children, onDelete }: Props) {
  const swipeable = useRef<SwipeableMethods>(null);
  const [width, setWidth] = useState(0);
  // Settes fra UI-tråden mens man drar: er raden dratt forbi terskelen akkurat nå?
  const pastThreshold = useRef(false);
  const threshold = width > 0 ? width * FULL_SWIPE_RATIO : FALLBACK_THRESHOLD;

  function remove() {
    pastThreshold.current = false;
    swipeable.current?.close();
    onDelete();
  }

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ReanimatedSwipeable
        ref={swipeable}
        friction={1}
        rightThreshold={40}
        overshootRight
        // Kalles når man slipper og raden skal bli liggende åpen. Langt sveip = slett nå.
        onSwipeableWillOpen={() => {
          if (pastThreshold.current) remove();
        }}
        renderRightActions={(_progress, translation) => (
          <DeleteAction
            translation={translation}
            threshold={threshold}
            onThresholdChange={(past) => {
              pastThreshold.current = past;
            }}
            onPress={remove}
          />
        )}
      >
        {/* Skjermlesere kan ikke sveipe, så de får «Slett» som handling på raden i stedet. */}
        <View
          accessibilityActions={[{ name: 'delete', label: 'Slett' }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
        >
          {children}
        </View>
      </ReanimatedSwipeable>
    </View>
  );
}

type ActionProps = {
  /** Hvor langt raden er dratt (negativ mot venstre). */
  translation: SharedValue<number>;
  threshold: number;
  onThresholdChange: (past: boolean) => void;
  onPress: () => void;
};

/**
 * Den røde flaten bak raden. Selve knappen er alltid ACTION_WIDTH bred, så Swipeable vet hvor
 * den skal stoppe ved kort sveip. Den røde bakgrunnen strekker seg til venstre når man drar lenger.
 */
function DeleteAction({ translation, threshold, onThresholdChange, onPress }: ActionProps) {
  useAnimatedReaction(
    () => -translation.value > threshold,
    (past, previous) => {
      if (past !== previous) scheduleOnRN(onThresholdChange, past);
    },
    [threshold],
  );

  const fill = useAnimatedStyle(() => ({
    width: Math.max(ACTION_WIDTH, -translation.value - 8),
  }));
  // Forbi terskelen følger «Slett» venstre kant av den røde flaten, som i Mail.
  const label = useAnimatedStyle(() => {
    const dragged = Math.max(ACTION_WIDTH, -translation.value - 8);
    const past = -translation.value > threshold;
    return { transform: [{ translateX: past ? -(dragged - ACTION_WIDTH) : 0 }] };
  });

  return (
    <Pressable style={styles.action} onPress={onPress} accessibilityRole="button" accessibilityLabel="Slett">
      <Animated.View style={[styles.fill, fill]} />
      <Animated.View style={label}>
        <Text variant="bodyStrong" color={colors.onPrimary}>Slett</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Ligger bak teksten og vokser mot venstre fra høyre kant.
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: colors.danger,
    borderRadius: radius.row,
  },
});
