// Hvor langt man har kommet i oppstarten etter at husstanden er opprettet. Lagres lokalt per bruker
// (secureStorage), ikke i databasen: går man ut av appen midt i oppstarten, fortsetter den på samme
// steg neste gang. På en ny enhet finnes ingen fremdrift, og man havner i fanene med det som er lagret.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { secureStorage } from '../../lib/secureStorage';
import { parseOnboardingProgress, type OnboardingProgress } from './onboardingSteps';

const storageKey = (userId: string) => `onboarding.${userId}`;
export const onboardingProgressKey = (userId: string) => ['onboarding', userId] as const;

export async function loadOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
  return parseOnboardingProgress(await secureStorage.getItem(storageKey(userId)));
}

export async function saveOnboardingProgress(userId: string, progress: OnboardingProgress): Promise<void> {
  await secureStorage.setItem(storageKey(userId), JSON.stringify(progress));
}

export async function clearOnboardingProgress(userId: string): Promise<void> {
  await secureStorage.removeItem(storageKey(userId));
}

/** Fremdriften, delt mellom app/(app)/_layout.tsx og oppstarten. Av for anonyme enheter. */
export function useOnboardingProgress(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: onboardingProgressKey(userId ?? ''),
    queryFn: () => loadOnboardingProgress(userId!),
    enabled: enabled && !!userId,
    staleTime: Infinity,
  });
}

/** Lagrer eller sletter fremdriften, og oppdaterer den delte verdien med én gang. */
export function useSetOnboardingProgress(userId: string) {
  const queryClient = useQueryClient();
  return async (progress: OnboardingProgress | null) => {
    if (progress) await saveOnboardingProgress(userId, progress);
    else await clearOnboardingProgress(userId);
    queryClient.setQueryData(onboardingProgressKey(userId), progress);
  };
}
