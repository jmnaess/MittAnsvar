import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from '../src/features/auth/SessionProvider';

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      <RootStack />
    </SessionProvider>
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
