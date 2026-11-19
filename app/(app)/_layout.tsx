import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { signOutLocal } from '../../src/features/auth/api';
import { useSession } from '../../src/features/auth/SessionProvider';
import { useFamilyBoard } from '../../src/features/display/hooks';
import { useMyHousehold } from '../../src/features/household/hooks';
import { toNorwegianMessage } from '../../src/lib/errors';
import { Button, makeStyles, spacing, Text, useTheme } from '../../src/ui';
// Modalene (Ny oppgave, Opptjent …) får samme header som fanene.
import { modalScreenOptions } from '../../src/ui/tabOptions';

// Innloggede skjermer. Innlogging styres av Stack.Protected i app/_layout.tsx.
// Her avgjør husstanden og typen bruker hva man ser:
//   voksen uten husstand        → oppstart
//   voksen med husstand         → fanene
//   anonym enhet, ikke koblet   → «Koble til» (skann eller tast kode)
//   barnets enhet, koblet       → barnets faner (bare egne oppgaver, jobber og lønn)
//   familieskjerm, koblet       → tavla for hele husstanden
export default function AppLayout() {
  const { session } = useSession();
  const { data: household, isPending, error, refetch, isRefetching } = useMyHousehold();
  const isAnonymous = !!session?.user.is_anonymous;
  // Bare anonyme enheter kan være en familieskjerm. Skjermen er ikke medlem, så den ser ingen husstand.
  const board = useFamilyBoard(isAnonymous);
  const isDisplay = isAnonymous && !!board.data;
  const isChildDevice = isAnonymous && !isDisplay;
  const pending = isPending || (isAnonymous && board.isPending);
  const { colors } = useTheme();
  const styles = useStyles();
  useSignOutWhenUnlinked(isAnonymous, !!household || isDisplay, pending);

  if (pending) return null;

  // Viktig: ved feil (f.eks. uten nett) vet vi ikke om brukeren har husstand.
  // Da skal vi ikke vise oppstarten, ellers kan de prøve å lage en husstand til.
  // En koblet skjerm viser de siste dataene sine i stedet, og prøver igjen av seg selv.
  const blockingError = isDisplay ? null : (error ?? (isAnonymous ? board.error : null));
  if (blockingError) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>{toNorwegianMessage(blockingError)}</Text>
        <Button
          title="Prøv igjen"
          onPress={() => {
            refetch();
            if (isAnonymous) board.refetch();
          }}
          disabled={isRefetching || board.isRefetching}
        />
      </View>
    );
  }

  const isAdultHome = !!household && !isAnonymous;

  return (
    <Stack screenOptions={modalScreenOptions(colors)}>
      <Stack.Protected guard={isAdultHome}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="display/link"
          options={{ headerShown: true, title: 'Legg til familieskjerm', presentation: 'modal' }}
        />
        <Stack.Screen
          name="child/new"
          options={{ headerShown: true, title: 'Legg til barn', presentation: 'modal' }}
        />
        <Stack.Screen
          name="child/[id]"
          options={{ headerShown: true, title: 'Endre barn', presentation: 'modal' }}
        />
        <Stack.Screen
          name="child/link/[id]"
          options={{ headerShown: true, title: 'Koble til enhet', presentation: 'modal' }}
        />
        <Stack.Screen
          name="member/[id]"
          options={{ headerShown: true, title: 'Profilbilde', presentation: 'modal' }}
        />
        <Stack.Screen
          name="earnings/[id]"
          options={{ headerShown: true, title: 'Opptjent', presentation: 'modal' }}
        />
        <Stack.Screen
          name="job/new"
          options={{ headerShown: true, title: 'Ny ledig jobb', presentation: 'modal' }}
        />
        <Stack.Screen
          name="job/[id]"
          options={{ headerShown: true, title: 'Endre jobb', presentation: 'modal' }}
        />
        <Stack.Screen
          name="year-task/new"
          options={{ headerShown: true, title: 'Ny årlig oppgave', presentation: 'modal' }}
        />
        <Stack.Screen
          name="home-profile"
          options={{ headerShown: true, title: 'Hjemmet', presentation: 'modal' }}
        />
        <Stack.Screen
          name="routines"
          options={{ headerShown: true, title: 'Forslag til hverdagen', presentation: 'modal' }}
        />
        <Stack.Screen
          name="task/new"
          options={{ headerShown: true, title: 'Ny oppgave', presentation: 'modal' }}
        />
        <Stack.Screen
          name="task/today"
          options={{ headerShown: true, title: 'Oppgave i dag', presentation: 'modal' }}
        />
        <Stack.Screen
          name="task/[id]"
          options={{ headerShown: true, title: 'Endre oppgave', presentation: 'modal' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!household && !isAnonymous}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!!household && isChildDevice}>
        <Stack.Screen name="(child)" />
      </Stack.Protected>
      <Stack.Protected guard={!household && isChildDevice}>
        <Stack.Screen name="link-device" />
      </Stack.Protected>
      <Stack.Protected guard={isDisplay}>
        <Stack.Screen name="(display)" />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * En voksen har koblet fra enheten (barnets enhet eller familieskjermen): koblingen var der, men
 * er borte. Da logges enheten ut, i stedet for å bli stående på «Koble til». Brukeren er allerede
 * slettet på serveren, så vi logger bare ut lokalt.
 */
function useSignOutWhenUnlinked(isAnonymous: boolean, isLinked: boolean, isPending: boolean) {
  const wasLinked = useRef(false);
  useEffect(() => {
    if (!isAnonymous || isPending) return;
    if (isLinked) wasLinked.current = true;
    else if (wasLinked.current) {
      wasLinked.current = false;
      signOutLocal();
    }
  }, [isAnonymous, isLinked, isPending]);
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    error: { flex: 1, justifyContent: 'center', padding: spacing.page, gap: 16, backgroundColor: colors.background },
    errorText: { textAlign: 'center' },
  }),
);
