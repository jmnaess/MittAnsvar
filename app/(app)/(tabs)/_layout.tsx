import { Tabs } from 'expo-router';
import { useSession } from '../../../src/features/auth/SessionProvider';
import { useMembers, useMyHousehold } from '../../../src/features/household/hooks';
import { ReminderPrompt } from '../../../src/features/notifications/components/ReminderPrompt';
import { useOpenTodayOnTap, useReminderSync } from '../../../src/features/notifications/hooks';

export default function TabsLayout() {
  // Fanene vises bare med husstand og innlogget bruker (se app/(app)/_layout.tsx).
  const { data: household } = useMyHousehold();
  const { session } = useSession();
  const { data: members = [] } = useMembers(household!.id);
  const userId = session!.user.id;
  const me = members.find((m) => m.auth_user_id === userId);

  // Påminnelser planlegges her, fordi fanene alltid er montert når man er inne i appen.
  useReminderSync(household!.id, userId, me?.id ?? null);
  useOpenTodayOnTap();

  return (
    <>
      <Tabs>
        <Tabs.Screen name="index" options={{ title: 'I dag' }} />
        <Tabs.Screen name="tasks" options={{ title: 'Oppgaver' }} />
        <Tabs.Screen name="year" options={{ title: 'Årshjul' }} />
        <Tabs.Screen name="household" options={{ title: 'Husstand' }} />
        <Tabs.Screen name="settings" options={{ title: 'Innstillinger' }} />
      </Tabs>
      <ReminderPrompt userId={userId} />
    </>
  );
}
