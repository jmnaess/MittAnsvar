import { Stack } from 'expo-router';

/** Familieskjermen: én skjerm, uten faner og uten vei ut. Bare en voksen kan koble den fra. */
export default function DisplayLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
