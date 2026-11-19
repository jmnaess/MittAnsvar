import { router } from 'expo-router';
import { useState } from 'react';
import { pickHomeProfile } from '../../src/features/household/homeProfile';
import { useMyHousehold, useMyMember } from '../../src/features/household/hooks';
import { RoutineSuggestionsFlow } from '../../src/features/templates/components/RoutineSuggestionsFlow';
import { Message, ModalFormScreen } from '../../src/ui';

/** Innstillinger → «Forslag til hverdagen»: rutiner for husstanden og barna. Bare voksne. */
export default function RoutinesScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const me = useMyMember(household!.id);
  const [profile] = useState(() => ({ type: household!.type, ...pickHomeProfile(household!) }));

  return (
    <ModalFormScreen closeTitle="Lukk">
      {me && me.role !== 'adult' ? (
        <Message tone="muted">Bare voksne kan legge til oppgaver.</Message>
      ) : (
        <RoutineSuggestionsFlow
          householdId={household!.id}
          household={profile}
          variant="settings"
          onDone={() => router.back()}
        />
      )}
    </ModalFormScreen>
  );
}
