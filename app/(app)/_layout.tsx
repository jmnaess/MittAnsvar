import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { useMyHousehold } from '../../src/features/household/hooks';
import { toNorwegianMessage } from '../../src/lib/errors';

// Innloggede skjermer. Innlogging styres av Stack.Protected i app/_layout.tsx.
// Her avgjør husstanden hva man ser: uten husstand → oppstart, med husstand → fanene.
export default function AppLayout() {
  const { data: household, isPending, error, refetch, isRefetching } = useMyHousehold();

  if (isPending) return null;

  // Viktig: ved feil (f.eks. uten nett) vet vi ikke om brukeren har husstand.
  // Da skal vi ikke vise oppstarten, ellers kan de prøve å lage en husstand til.
  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>{toNorwegianMessage(error)}</Text>
        <Button title="Prøv igjen" onPress={() => refetch()} disabled={isRefetching} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!household}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="child/new"
          options={{ headerShown: true, title: 'Legg til barn', presentation: 'modal' }}
        />
        <Stack.Screen
          name="child/[id]"
          options={{ headerShown: true, title: 'Endre barn', presentation: 'modal' }}
        />
        <Stack.Screen
          name="earnings/[id]"
          options={{ headerShown: true, title: 'Opptjent', presentation: 'modal' }}
        />
        <Stack.Screen
          name="job/new"
          options={{ headerShown: true, title: 'Ny ledig jobb', presentation: 'modal' }}
        />
        <Stack.Screen
          name="job/[id]"
          options={{ headerShown: true, title: 'Endre jobb', presentation: 'modal' }}
        />
        <Stack.Screen
          name="task/new"
          options={{ headerShown: true, title: 'Ny oppgave', presentation: 'modal' }}
        />
        <Stack.Screen
          name="task/[id]"
          options={{ headerShown: true, title: 'Endre oppgave', presentation: 'modal' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!household}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { fontSize: 16, textAlign: 'center' },
});
