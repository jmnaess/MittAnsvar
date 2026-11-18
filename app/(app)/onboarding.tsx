import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarStack, Button, colors, Message, spacing, Text } from '../../src/ui';
import type { CreateHouseholdInput } from '../../src/features/household/api';
import { ChildForm } from '../../src/features/household/components/ChildForm';
import { HouseholdForm } from '../../src/features/household/components/HouseholdForm';
import { JoinHouseholdForm } from '../../src/features/household/components/JoinHouseholdForm';
import { MemberRow } from '../../src/features/household/components/MemberRow';
import { emptyHomeProfile } from '../../src/features/household/homeProfile';
import { HomeProfileFlow } from '../../src/features/templates/components/HomeProfileFlow';
import {
  householdKeys,
  useAcceptInvite,
  useAddChild,
  useCreateHousehold,
  useMembers,
} from '../../src/features/household/hooks';
import type { ChildInput } from '../../src/features/household/types';
import { useSession } from '../../src/features/auth/SessionProvider';
import { useAccountActions } from '../../src/features/auth/useAccountActions';
import { setReminderPromptPending } from '../../src/features/notifications/settings';
import { toNorwegianMessage } from '../../src/lib/errors';

// Oppstart for en innlogget bruker uten husstand. Tre visninger på samme skjerm:
//   choose: velg «Opprett husstand» eller «Bli med i en husstand»
//   create: opprett husstand, deretter barn (bare «Familie med barn») og om hjemmet
//           (hjemprofil med forslag til årshjulet). Begge kan hoppes over.
//   join:   skriv inn kode fra en annen voksen, navn og avatar
// Når vi er ferdige, henter vi husstanden på nytt. Da bytter app/(app)/_layout.tsx til fanene.
type Mode = 'choose' | 'create' | 'join';

export default function OnboardingScreen() {
  const [mode, setMode] = useState<Mode>('choose');
  const back = () => setMode('choose');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {mode === 'choose' && <ChooseStep onChoose={setMode} />}
          {mode === 'create' && <CreateFlow onBack={back} />}
          {mode === 'join' && <JoinStep onBack={back} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChooseStep({ onChoose }: { onChoose: (mode: Mode) => void }) {
  return (
    <>
      <AvatarStack people={['fox', 'cat', 'bear', 'frog', 'rabbit'].map((avatar) => ({ avatar }))} size={48} max={5} />
      <Text variant="pageTitle">Velkommen!</Text>
      <Text>
        Lag en ny husstand, eller bli med i en som en annen voksen allerede har laget.
      </Text>
      <Button title="Opprett husstand" onPress={() => onChoose('create')} />
      <Button variant="secondary" title="Bli med i en husstand" onPress={() => onChoose('join')} />
      <AccountFooter />
    </>
  );
}

// Utlogging og sletting også her: en bruker uten husstand (f.eks. etter en sletting som
// stoppet halvveis) skal kunne komme seg ut eller fullføre slettingen.
function AccountFooter() {
  const { session } = useSession();
  const { busy, confirmSignOut, confirmDeleteAccount } = useAccountActions();

  return (
    <View style={styles.account}>
      <Text variant="meta" color={colors.textMuted}>Innlogget som {session?.user.email}</Text>
      <Button variant="text" title="Logg ut" onPress={confirmSignOut} disabled={busy} />
      <Button variant="text" title="Slett konto" onPress={confirmDeleteAccount} disabled={busy} />
    </View>
  );
}

// Opprett husstand → barn (bare familie) → om hjemmet. Barn og hjemmet kan hoppes over.
type CreateStep =
  | { kind: 'household' }
  | { kind: 'children' | 'home'; householdId: string; input: CreateHouseholdInput };

function CreateFlow({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const createHousehold = useCreateHousehold();
  const [step, setStep] = useState<CreateStep>({ kind: 'household' });
  const [finishing, setFinishing] = useState(false);

  const { session } = useSession();

  async function finish() {
    setFinishing(true);
    // Spør om påminnelser når fanene vises (se ReminderPrompt), ikke ved første oppstart.
    await setReminderPromptPending(session!.user.id, true);
    await queryClient.invalidateQueries({ queryKey: householdKeys.mine });
    setFinishing(false); // skjermen er normalt borte nå; dette gjelder hvis hentingen feilet
  }

  function handleCreate(input: CreateHouseholdInput) {
    createHousehold.mutate(input, {
      onSuccess: (householdId) =>
        setStep({ kind: input.type === 'family' ? 'children' : 'home', householdId, input }),
    });
  }

  if (step.kind === 'children') {
    return (
      <ChildrenStep
        householdId={step.householdId}
        finishing={finishing}
        onDone={() => setStep({ ...step, kind: 'home' })}
      />
    );
  }

  if (step.kind === 'home') {
    // Når finish() henter husstanden, bytter appen til fanene og denne skjermen forsvinner.
    return (
      <HomeProfileFlow
        householdId={step.householdId}
        householdType={step.input.type}
        saved={emptyHomeProfile(step.input.housingType)}
        variant="onboarding"
        onDone={finish}
      />
    );
  }

  const busy = createHousehold.isPending || finishing;
  return (
    <>
      <Text variant="pageTitle">Opprett husstand</Text>
      <Text>
        Fortell litt om husstanden, så tilpasser vi forslagene til dere.
      </Text>
      <HouseholdForm busy={busy} onSubmit={handleCreate} />
      {createHousehold.error && <Message>{toNorwegianMessage(createHousehold.error)}</Message>}
      <Button variant="text" title="Tilbake" onPress={onBack} disabled={busy} />
    </>
  );
}

function JoinStep({ onBack }: { onBack: () => void }) {
  const acceptInvite = useAcceptInvite();
  const { session } = useSession();

  // Flagget settes før husstanden hentes på nytt (det gjør useAcceptInvite ved suksess),
  // så spørsmålet er klart når fanene vises.
  async function join(input: Parameters<typeof acceptInvite.mutateAsync>[0]) {
    await setReminderPromptPending(session!.user.id, true);
    acceptInvite.mutate(input, {
      onError: () => setReminderPromptPending(session!.user.id, false),
    });
  }

  return (
    <>
      <Text variant="pageTitle">Bli med i en husstand</Text>
      <Text>
        Be en voksen i husstanden om en kode. De finner den under fanen Husstand, «Inviter voksen».
      </Text>
      <JoinHouseholdForm
        busy={acceptInvite.isPending}
        onSubmit={join}
      />
      {acceptInvite.error && <Message>{toNorwegianMessage(acceptInvite.error)}</Message>}
      <Button variant="text" title="Tilbake" onPress={onBack} disabled={acceptInvite.isPending} />
    </>
  );
}

type ChildrenStepProps = { householdId: string; finishing: boolean; onDone: () => void };

function ChildrenStep({ householdId, finishing, onDone }: ChildrenStepProps) {
  const { data: members } = useMembers(householdId);
  const addChild = useAddChild(householdId);
  // Ny key etter hvert barn gir et tomt skjema til neste.
  const [formKey, setFormKey] = useState(0);

  const children = members?.filter((m) => m.role === 'child') ?? [];

  function handleAdd(child: ChildInput) {
    addChild.mutate(child, { onSuccess: () => setFormKey((k) => k + 1) });
  }

  return (
    <>
      <Text variant="pageTitle">Legg til barn</Text>
      <Text>
        Barn får en profil med fornavn og avatar, ingen e-post eller konto. Du kan også gjøre dette
        senere i Innstillinger.
      </Text>

      {children.length > 0 && (
        <View style={styles.children}>
          {children.map((child) => (
            <MemberRow key={child.id} member={child} />
          ))}
        </View>
      )}

      <ChildForm
        key={formKey}
        submitLabel="Legg til barn"
        busy={addChild.isPending || finishing}
        onSubmit={handleAdd}
      />
      {addChild.error && <Message>{toNorwegianMessage(addChild.error)}</Message>}

      <View style={styles.done}>
        <Button
          variant="secondary"
          title={children.length > 0 ? 'Ferdig' : 'Hopp over'}
          onPress={onDone}
          disabled={addChild.isPending || finishing}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { padding: spacing.page, gap: 16, paddingBottom: 48 },
  children: { gap: spacing.row },
  done: { marginTop: 8 },
  account: { marginTop: spacing.section, alignItems: 'center' },
});
