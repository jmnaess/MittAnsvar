import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarStack, Button, makeStyles, Message, pageWidth, spacing, Text, useTheme } from '../../src/ui';
import type { CreateHouseholdInput } from '../../src/features/household/api';
import { ChildForm } from '../../src/features/household/components/ChildForm';
import { HouseholdForm } from '../../src/features/household/components/HouseholdForm';
import { JoinHouseholdForm } from '../../src/features/household/components/JoinHouseholdForm';
import { MemberRow } from '../../src/features/household/components/MemberRow';
import { emptyHomeProfile } from '../../src/features/household/homeProfile';
import {
  householdEditChanges,
  nextStep,
  prevStep,
  type OnboardingStep,
} from '../../src/features/household/onboardingSteps';
import { HomeProfileFlow } from '../../src/features/templates/components/HomeProfileFlow';
import { RoutineSuggestionsFlow } from '../../src/features/templates/components/RoutineSuggestionsFlow';
import {
  householdKeys,
  useAcceptInvite,
  useAddChild,
  useCreateHousehold,
  useDeleteChild,
  useMembers,
  useMyMember,
  useSetMyAvatar,
  useUpdateChild,
  useUpdateHousehold,
  useUpdateMemberName,
} from '../../src/features/household/hooks';
import type { ChildInput, HomeProfile } from '../../src/features/household/types';
import { useSession } from '../../src/features/auth/SessionProvider';
import { useAccountActions } from '../../src/features/auth/useAccountActions';
import { setReminderPromptPending } from '../../src/features/notifications/settings';
import { toNorwegianMessage } from '../../src/lib/errors';

// Oppstart for en innlogget bruker uten husstand. Tre visninger på samme skjerm:
//   choose: velg «Opprett husstand» eller «Bli med i en husstand»
//   create: opprett husstand, deretter barn (bare «Familie med barn»), hverdagen (rutiner, barna
//           etter alder) og om hjemmet (hjemprofil med forslag til årshjulet). Alt kan hoppes over,
//           og man kan gå tilbake og rette uten at noe lages to ganger.
//   join:   skriv inn kode fra en annen voksen, navn og avatar
// Når vi er ferdige, henter vi husstanden på nytt. Da bytter app/(app)/_layout.tsx til fanene.
type Mode = 'choose' | 'create' | 'join';

export default function OnboardingScreen() {
  const styles = useStyles();
  const [mode, setMode] = useState<Mode>('choose');
  const back = () => setMode('choose');
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {mode === 'choose' && <ChooseStep onChoose={setMode} />}
          {mode === 'create' && <CreateFlow onBack={back} onScrollToTop={scrollToTop} />}
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
        Her ser alle hva som er deres ansvar i dag. Barna lærer å ta sin del, og dere voksne slipper
        å huske alt selv.
      </Text>
      <Text>Lag en ny husstand, eller bli med i en som en annen voksen har laget.</Text>
      <Button title="Opprett husstand" onPress={() => onChoose('create')} />
      <Button variant="secondary" title="Bli med i en husstand" onPress={() => onChoose('join')} />
      <AccountFooter />
    </>
  );
}

// Utlogging og sletting også her: en bruker uten husstand (f.eks. etter en sletting som
// stoppet halvveis) skal kunne komme seg ut eller fullføre slettingen.
function AccountFooter() {
  const { colors } = useTheme();
  const styles = useStyles();
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

// Opprett husstand → barn (bare familie) → hverdagen → om hjemmet. Alt etter husstanden kan hoppes over.
// Hvert steg har «Tilbake». Det som er lagret, opprettes aldri på nytt: husstanden oppdateres,
// barna og forslagene leses fra databasen (se onboardingSteps.ts og docs/DESIGN.md).
type Created = { householdId: string; input: CreateHouseholdInput };

type CreateFlowProps = { onBack: () => void; onScrollToTop: () => void };

function CreateFlow({ onBack, onScrollToTop }: CreateFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<OnboardingStep>('household');
  const [created, setCreated] = useState<Created | null>(null);
  // Hjemprofilen huskes her: husstanden kan ikke hentes på nytt i oppstarten (da vises fanene).
  const [homeProfile, setHomeProfile] = useState<HomeProfile | null>(null);
  const [finishing, setFinishing] = useState(false);

  const { session } = useSession();

  async function finish() {
    setFinishing(true);
    // Spør om påminnelser når fanene vises (se ReminderPrompt), ikke ved første oppstart.
    await setReminderPromptPending(session!.user.id, true);
    await queryClient.invalidateQueries({ queryKey: householdKeys.mine });
    setFinishing(false); // skjermen er normalt borte nå; dette gjelder hvis hentingen feilet
  }

  function go(to: OnboardingStep | null) {
    if (to === null) return;
    setStep(to);
    onScrollToTop();
  }

  /** Første steg er lagret (opprettet eller endret). Boligtypen følger med til hjemprofilen. */
  function handleSaved(next: Created) {
    setCreated(next);
    setHomeProfile((prev) =>
      prev ? { ...prev, housing_type: next.input.housingType } : emptyHomeProfile(next.input.housingType),
    );
    go(nextStep('household', next.input.type));
  }

  if (step === 'household' || !created || !homeProfile) {
    return (
      <HouseholdStep
        created={created}
        finishing={finishing}
        onSaved={handleSaved}
        onBack={onBack}
      />
    );
  }

  const { householdId, input } = created;
  const back = () => go(prevStep(step, input.type));
  const forward = () => go(nextStep(step, input.type));

  if (step === 'children') {
    return (
      <ChildrenStep
        householdId={householdId}
        finishing={finishing}
        onAdded={onScrollToTop}
        onDone={forward}
        onBack={back}
      />
    );
  }

  if (step === 'routines') {
    return (
      <RoutineSuggestionsFlow
        householdId={householdId}
        household={{ type: input.type, ...homeProfile }}
        variant="onboarding"
        onDone={forward}
        onBack={back}
      />
    );
  }

  // Når finish() henter husstanden, bytter appen til fanene og denne skjermen forsvinner.
  return (
    <HomeProfileFlow
      householdId={householdId}
      householdType={input.type}
      saved={homeProfile}
      variant="onboarding"
      onSaved={setHomeProfile}
      onDone={finish}
      onBack={back}
    />
  );
}

type HouseholdStepProps = {
  created: Created | null;
  finishing: boolean;
  onSaved: (created: Created) => void;
  /** Tilbake til valget (opprett / bli med). Bare før husstanden er opprettet. */
  onBack: () => void;
};

function HouseholdStep({ created, finishing, onSaved, onBack }: HouseholdStepProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <>
      <Text variant="pageTitle">Opprett husstand</Text>
      <Text>
        Fortell litt om husstanden, så tilpasser vi forslagene til dere.
      </Text>
      {created ? (
        <EditHousehold created={created} finishing={finishing} onSaved={onSaved} />
      ) : (
        <CreateHousehold finishing={finishing} onSaved={onSaved} onBack={onBack} />
      )}
      <Text variant="meta" color={colors.textMuted} style={styles.later}>
        Du kan endre dette senere under Innstillinger.
      </Text>
    </>
  );
}

function CreateHousehold({ finishing, onSaved, onBack }: Omit<HouseholdStepProps, 'created'>) {
  const createHousehold = useCreateHousehold();
  const busy = createHousehold.isPending || finishing;

  function handleCreate(input: CreateHouseholdInput) {
    createHousehold.mutate(input, { onSuccess: (householdId) => onSaved({ householdId, input }) });
  }

  return (
    <>
      <HouseholdForm busy={busy} onSubmit={handleCreate} />
      {createHousehold.error && <Message>{toNorwegianMessage(createHousehold.error)}</Message>}
      <Button variant="text" title="Tilbake" onPress={onBack} disabled={busy} />
    </>
  );
}

/**
 * Tilbake til første steg etter at husstanden finnes: skjemaet er utfylt, og lagring oppdaterer
 * bare det som er endret. Husstanden hentes ikke på nytt (refetch: false), ellers vises fanene.
 */
function EditHousehold({ created, finishing, onSaved }: Omit<HouseholdStepProps, 'onBack' | 'created'> & { created: Created }) {
  const { householdId } = created;
  const me = useMyMember(householdId);
  const updateHousehold = useUpdateHousehold(householdId, { refetch: false });
  const updateName = useUpdateMemberName(householdId);
  const setAvatar = useSetMyAvatar(householdId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(input: CreateHouseholdInput) {
    if (!me) return;
    const changes = householdEditChanges(created.input, input);
    setBusy(true);
    setError(null);
    try {
      if (Object.keys(changes.household).length > 0) await updateHousehold.mutateAsync(changes.household);
      if (changes.displayName !== undefined) {
        await updateName.mutateAsync({ memberId: me.id, displayName: changes.displayName });
      }
      if (changes.avatar !== undefined) await setAvatar.mutateAsync(changes.avatar);
    } catch (e) {
      setError(toNorwegianMessage(e));
      setBusy(false);
      return;
    }
    setBusy(false);
    onSaved({ householdId, input });
  }

  return (
    <>
      <HouseholdForm
        busy={busy || finishing || !me}
        initial={created.input}
        submitLabel="Lagre og fortsett"
        onSubmit={handleSave}
      />
      {error && <Message>{error}</Message>}
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

type ChildrenStepProps = {
  householdId: string;
  finishing: boolean;
  /** Etter hvert barn: rull til toppen, så barnet synes i listen. */
  onAdded: () => void;
  onDone: () => void;
  onBack: () => void;
};

/**
 * Barna leses fra databasen, så de som er lagt til, står der når man kommer tilbake. Trykk på et
 * barn åpner det i skjemaet (endre eller fjerne). Nye barn legges bare til med «Legg til».
 */
function ChildrenStep({ householdId, finishing, onAdded, onDone, onBack }: ChildrenStepProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { data: members } = useMembers(householdId);
  const addChild = useAddChild(householdId);
  const updateChild = useUpdateChild(householdId);
  const deleteChild = useDeleteChild(householdId);
  // Ny key etter hvert barn gir et tomt skjema til neste.
  const [formKey, setFormKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const children = members?.filter((m) => m.role === 'child') ?? [];
  const editing = children.find((c) => c.id === editingId) ?? null;
  const busy = addChild.isPending || updateChild.isPending || deleteChild.isPending || finishing;
  const error = addChild.error ?? updateChild.error ?? deleteChild.error;

  function handleAdd(child: ChildInput) {
    addChild.mutate(child, {
      onSuccess: () => {
        setFormKey((k) => k + 1);
        onAdded();
      },
    });
  }

  function startEdit(id: string) {
    setEditingId(id);
    onAdded(); // skjemaet står øverst
  }

  function handleUpdate(child: ChildInput) {
    if (!editing) return;
    updateChild.mutate({ memberId: editing.id, child }, { onSuccess: () => setEditingId(null) });
  }

  function confirmRemove() {
    if (!editing) return;
    Alert.alert(
      `Slette ${editing.display_name}?`,
      'Barneprofilen og historikken til barnet slettes. Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: () => deleteChild.mutate(editing, { onSuccess: () => setEditingId(null) }),
        },
      ],
    );
  }

  return (
    <>
      <Text variant="pageTitle">Legg til barn</Text>
      <Text>
        Barna får egne oppgaver og lærer å ta sin del hjemme. De får en profil med fornavn og figur,
        uten e-post eller konto. Du kan også legge dem til senere under Husstand.
      </Text>

      {editing ? (
        <>
          <Text variant="sectionTitle" accessibilityRole="header">{`Endre ${editing.display_name}`}</Text>
          <ChildForm
            key={editing.id}
            initial={{ display_name: editing.display_name, avatar: editing.avatar, birth_year: editing.birth_year }}
            submitLabel="Lagre"
            busy={busy}
            onSubmit={handleUpdate}
            onCancel={() => setEditingId(null)}
            onRemove={confirmRemove}
          />
          {error && <Message>{toNorwegianMessage(error)}</Message>}
        </>
      ) : (
        <>
          {children.length > 0 && (
            <View style={styles.children}>
              {children.map((child) => (
                <MemberRow
                  key={child.id}
                  member={child}
                  onPress={busy ? undefined : () => startEdit(child.id)}
                  accessibilityHint="Endre eller fjerne"
                />
              ))}
              <Text variant="meta" color={colors.textMuted}>
                Trykk på et barn for å endre. Har du flere barn? Legg dem til under.
              </Text>
            </View>
          )}

          {children.length > 0 && (
            <Text variant="sectionTitle" accessibilityRole="header">Legg til et barn til</Text>
          )}
          <ChildForm
            key={formKey}
            submitLabel={children.length > 0 ? 'Legg til' : 'Legg til barn'}
            busy={busy}
            onSubmit={handleAdd}
          />
          {error && <Message>{toNorwegianMessage(error)}</Message>}

          <View style={styles.done}>
            <Button
              variant="secondary"
              title={children.length > 0 ? 'Ferdig' : 'Hopp over'}
              onPress={onDone}
              disabled={busy}
            />
          </View>
          <Button variant="text" title="Tilbake" onPress={onBack} disabled={busy} />
        </>
      )}
    </>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    container: { ...pageWidth, padding: spacing.page, gap: 16, paddingBottom: 48 },
    children: { gap: spacing.row },
    done: { marginTop: 8 },
    account: { marginTop: spacing.section, alignItems: 'center' },
    later: { textAlign: 'center' },
  }),
);
