import { Stack } from 'expo-router';

// Innloggede skjermer. Sjekk av innlogging legges til i steg 3.
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
