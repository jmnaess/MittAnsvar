import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider, useSession } from '../src/features/auth/SessionProvider';
import { queryClient } from '../src/lib/queryClient';

export default function RootLayout() {
  // Fontene lastes før noe vises, ellers blinker teksten fra systemfont til Fredoka/Nunito.
  // Ved feil (fontError) vises appen likevel, med systemfont.
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  if (!fontsLoaded && !fontError) return null;

  // GestureHandlerRootView: kreves av react-native-gesture-handler (sveip for å slette i «Oppgaver»).
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          {/* Appen er bare i lys modus, så statuslinjen har alltid mørk tekst. */}
          <StatusBar style="dark" />
          <RootStack />
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

// Stack.Protected viser bare skjermene der guard er sann. Når sesjonen endres,
// bytter expo-router automatisk mellom innlogging og fanene.
// En beskyttet skjerm sender brukeren til første tilgjengelige skjerm. Derfor
// ligger sign-in.tsx rett i app/ (adresse /sign-in) og ikke i en gruppe: en gruppe
// uten index-rute gir adressen "/", som bare finnes i (app) → «Unmatched Route».
function RootStack() {
  const { session, isLoading } = useSession();

  // Ikke vis innloggingsskjermen et øyeblikk mens sesjonen leses fra enheten.
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
