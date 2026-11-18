import { Tabs } from 'expo-router';
import { tabIcon, useTheme } from '../../../src/ui';
import { tabScreenOptions } from '../../../src/ui/tabOptions';

/**
 * Barnets egen enhet (steg 10a): «I dag», «Min lønn» og «Innstillinger» (bare egen avatar og
 * utlogging). Ingen redigering av husstanden og ingen påminnelser (useReminderSync monteres bare
 * i de voksnes faner).
 */
export default function ChildTabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs screenOptions={tabScreenOptions(colors)}>
      {/* «I dag» tegner sin egen topp med dato og stor tittel. */}
      <Tabs.Screen
        name="index"
        options={{ title: 'I dag', tabBarIcon: tabIcon('sunny'), headerShown: false }}
      />
      <Tabs.Screen name="my-earnings" options={{ title: 'Min lønn', tabBarIcon: tabIcon('wallet') }} />
      <Tabs.Screen
        name="my-settings"
        options={{ title: 'Innstillinger', tabBarIcon: tabIcon('settings') }}
      />
    </Tabs>
  );
}
