import { Tabs } from 'expo-router';

/**
 * Barnets egen enhet (steg 10a): «I dag», «Min lønn» og «Innstillinger» (bare egen avatar og
 * utlogging). Ingen redigering av husstanden og ingen påminnelser (useReminderSync monteres bare
 * i de voksnes faner).
 */
export default function ChildTabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'I dag' }} />
      <Tabs.Screen name="my-earnings" options={{ title: 'Min lønn' }} />
      <Tabs.Screen name="my-settings" options={{ title: 'Innstillinger' }} />
    </Tabs>
  );
}
