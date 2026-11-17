import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors } from './theme';

type Props = { children: ReactNode; onDelete: () => void };

/**
 * Dra raden mot venstre for å få fram «Slett» (react-native-gesture-handler, virker i Expo Go).
 * Trykk på «Slett» sletter med en gang. Det er greit fordi skjermen viser «Angre» etterpå.
 * Krever GestureHandlerRootView rundt appen (app/_layout.tsx).
 */
export function SwipeToDelete({ children, onDelete }: Props) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          style={styles.action}
          onPress={() => {
            methods.close();
            onDelete();
          }}
          accessibilityRole="button"
          accessibilityLabel="Slett"
        >
          <Text style={styles.text}>Slett</Text>
        </Pressable>
      )}
    >
      {/* Egen bakgrunn, så «Slett» ikke synes gjennom raden. Skjermlesere kan ikke sveipe,
          så de får «Slett» som handling på raden i stedet. */}
      <View
        style={styles.row}
        accessibilityActions={[{ name: 'delete', label: 'Slett' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
      >
        {children}
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.background },
  action: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
