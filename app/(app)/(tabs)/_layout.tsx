import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'I dag' }} />
      <Tabs.Screen name="year" options={{ title: 'Årshjul' }} />
      <Tabs.Screen name="household" options={{ title: 'Husstand' }} />
      <Tabs.Screen name="settings" options={{ title: 'Innstillinger' }} />
    </Tabs>
  );
}
