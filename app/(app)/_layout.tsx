import { Stack } from 'expo-router';

// Innloggede skjermer. Tilgangen styres av Stack.Protected i app/_layout.tsx.
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
