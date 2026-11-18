import { router } from 'expo-router';
import { useState } from 'react';
import { pickHomeProfile } from '../../src/features/household/homeProfile';
import { useMyHousehold, useMyMember } from '../../src/features/household/hooks';
import { HomeProfileFlow } from '../../src/features/templates/components/HomeProfileFlow';
import { Message, ModalFormScreen } from '../../src/ui';

/** Innstillinger → «Hjemmet»: endre hjemprofilen og få forslag ut fra nye svar. Bare voksne. */
export default function HomeProfileScreen() {
  // Skjermen er bare tilgjengelig med husstand (se app/(app)/_layout.tsx), så data finnes.
  const { data: household } = useMyHousehold();
  const me = useMyMember(household!.id);
  // Profilen slik den var da skjermen ble åpnet. Husstanden hentes på nytt etter lagring.
  const [saved] = useState(() => pickHomeProfile(household!));

  return (
    <ModalFormScreen closeTitle="Lukk">
      {me && me.role !== 'adult' ? (
        <Message tone="muted">Bare voksne kan endre dette.</Message>
      ) : (
        <HomeProfileFlow
          householdId={household!.id}
          householdType={household!.type}
          saved={saved}
          variant="settings"
          onDone={() => router.back()}
        />
      )}
    </ModalFormScreen>
  );
}
