import { Tabs } from 'expo-router';
import { MyProfileButton } from '../../../src/features/household/components/MyProfileButton';
import { spacing, tabIcon, useTheme } from '../../../src/ui';
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
      {/* Egen avatar øverst til høyre åpner «Innstillinger». Ikke på «Innstillinger» selv. */}
      <Tabs.Screen
        name="my-earnings"
        options={{
          title: 'Min lønn',
          tabBarIcon: tabIcon('wallet'),
          headerRight: () => <MyProfileButton />,
          headerRightContainerStyle: { paddingRight: spacing.page },
        }}
      />
      <Tabs.Screen
        name="my-settings"
        options={{ title: 'Innstillinger', tabBarIcon: tabIcon('settings') }}
      />
    </Tabs>
  );
}
