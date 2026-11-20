import { Tabs } from 'expo-router';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { ReminderPrompt } from '../../../src/features/notifications/components/ReminderPrompt';
import { useOpenTodayOnTap, useReminderSync } from '../../../src/features/notifications/hooks';
import { MyProfileButton } from '../../../src/features/household/components/MyProfileButton';
import { spacing, tabIcon, useTheme } from '../../../src/ui';
import { tabScreenOptions } from '../../../src/ui/tabOptions';

export default function TabsLayout() {
  // Fanene vises bare med husstand og innlogget bruker (se app/(app)/_layout.tsx).
  const { data: household } = useMyHousehold();
  const { session } = useSession();
  const { colors } = useTheme();
  const { data: members = [] } = useMembers(household!.id);
  const userId = session!.user.id;
  const me = members.find((m) => m.auth_user_id === userId);

  // Påminnelser planlegges her, fordi fanene alltid er montert når man er inne i appen.
  useReminderSync(household!.id, userId, me?.id ?? null);
  useOpenTodayOnTap();

  return (
    <>
      <Tabs screenOptions={tabScreenOptions(colors)}>
        {/* «I dag» tegner sin egen topp med dato og stor tittel. */}
        <Tabs.Screen
          name="index"
          options={{ title: 'I dag', tabBarIcon: tabIcon('sunny'), headerShown: false }}
        />
        {/* «Oppgaver» (Hverdag og Årshjul) tegner sin egen topp med tittel, pluss og segmenter. */}
        <Tabs.Screen
          name="tasks"
          options={{ title: 'Oppgaver', tabBarIcon: tabIcon('list'), headerShown: false }}
        />
        {/* Husstand og Innstillinger: egen avatar øverst til høyre i headeren, som snarvei til profilen. */}
        <Tabs.Screen
          name="household"
          options={{ title: 'Husstand', tabBarIcon: tabIcon('home'), ...profileHeaderRight }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Innstillinger', tabBarIcon: tabIcon('settings'), ...profileHeaderRight }}
        />
      </Tabs>
      <ReminderPrompt userId={userId} />
    </>
  );
}

/** Egen avatar i navigasjonsheaderen (se MyProfileButton). */
const profileHeaderRight = {
  headerRight: () => <MyProfileButton size={32} />,
  headerRightContainerStyle: { paddingRight: spacing.page },
};
