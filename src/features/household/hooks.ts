import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptInvite,
  addChild,
  createHousehold,
  createInvite,
  deleteChild,
  getMyHousehold,
  listActiveInvites,
  listMembers,
  revokeInvite,
  setMyAvatar,
  updateChild,
  updateHousehold,
  type HouseholdChanges,
} from './api';
import { useSession } from '../auth/SessionProvider';
import { type AvatarPhoto, memberPhoto, PHOTO_URL_TTL_SECONDS, photoPathsToSign } from './photo';
import {
  getSignedPhotoUrls,
  removeMemberPhoto,
  setMemberAvatarMode,
  setMyAvatarMode,
  uploadMemberPhoto,
} from './photoApi';
import type { AvatarMode, ChildInput, Member } from './types';

// Nøkler for cachen. Etter en endring «invaliderer» vi nøkkelen, så dataene hentes på nytt.
export const householdKeys = {
  mine: ['household'] as const,
  members: (householdId: string) => ['members', householdId] as const,
  photoUrls: (householdId: string, paths: string[]) => ['photo-urls', householdId, ...paths] as const,
  invites: (householdId: string) => ['invites', householdId] as const,
};

export function useMyHousehold() {
  return useQuery({ queryKey: householdKeys.mine, queryFn: getMyHousehold });
}

/**
 * pollUntil: hent på nytt hvert 3. sekund til funksjonen gir true (brukes mens QR-koden for
 * barnets enhet vises, så skjermen ser når barnet har koblet til).
 */
export function useMembers(
  householdId: string | undefined,
  { pollUntil }: { pollUntil?: (members: Member[]) => boolean } = {},
) {
  return useQuery({
    queryKey: householdKeys.members(householdId ?? ''),
    queryFn: () => listMembers(householdId!),
    enabled: !!householdId,
    refetchInterval: pollUntil
      ? (query) => (query.state.data && pollUntil(query.state.data) ? false : 3000)
      : undefined,
  });
}

/** Mitt eget medlem i husstanden (undefined til medlemmene er hentet). */
export function useMyMember(householdId: string | undefined): Member | undefined {
  const { session } = useSession();
  const { data: members } = useMembers(householdId);
  return members?.find((m) => m.auth_user_id === session?.user.id);
}

/**
 * Invaliderer IKKE husstanden. Oppstarten gjør det selv når barnesteget er ferdig,
 * ellers bytter appen til fanene før brukeren har fått lagt til barn.
 */
export function useCreateHousehold() {
  return useMutation({ mutationFn: createHousehold });
}

/**
 * refetch: false brukes i oppstarten. Der finnes ikke husstanden i cachen ennå, og henter vi den,
 * bytter appen til fanene før oppstarten er ferdig (se useCreateHousehold).
 */
export function useUpdateHousehold(householdId: string, { refetch = true }: { refetch?: boolean } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: HouseholdChanges) => updateHousehold(householdId, changes),
    onSuccess: () => (refetch ? queryClient.invalidateQueries({ queryKey: householdKeys.mine }) : undefined),
  });
}

function useInvalidateMembers(householdId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: householdKeys.members(householdId) });
}

export function useAddChild(householdId: string) {
  const onSuccess = useInvalidateMembers(householdId);
  return useMutation({ mutationFn: (child: ChildInput) => addChild(householdId, child), onSuccess });
}

export function useUpdateChild(householdId: string) {
  const onSuccess = useInvalidateMembers(householdId);
  return useMutation({
    mutationFn: ({ memberId, child }: { memberId: string; child: ChildInput }) =>
      updateChild(memberId, child),
    onSuccess,
  });
}

export function useSetMyAvatar(householdId: string) {
  const onSuccess = useInvalidateMembers(householdId);
  return useMutation({ mutationFn: setMyAvatar, onSuccess });
}

export function useDeleteChild(householdId: string) {
  const onSuccess = useInvalidateMembers(householdId);
  return useMutation({ mutationFn: deleteChild, onSuccess });
}

// ---------------------------------------------------------------------------
// Profilbilder
// ---------------------------------------------------------------------------

/**
 * Signerte URL-er til bildene i husstanden, som { sti: url }.
 * URL-ene varer i en time. Vi henter nye etter 50 minutter, så en URL aldri går ut mens den vises.
 * Selve bildet caches på disk av expo-image med stien som nøkkel, så nye URL-er laster ikke ned på nytt.
 */
export function useMemberPhotoUrls(householdId: string | undefined) {
  const { data: members } = useMembers(householdId);
  const paths = members ? photoPathsToSign(members) : [];
  return useQuery({
    queryKey: householdKeys.photoUrls(householdId ?? '', paths),
    queryFn: () => getSignedPhotoUrls(paths),
    enabled: paths.length > 0,
    staleTime: (PHOTO_URL_TTL_SECONDS - 10 * 60) * 1000,
    refetchInterval: (PHOTO_URL_TTL_SECONDS - 10 * 60) * 1000,
  });
}

/** Bildet som skal vises for et medlem, eller undefined (figuren). */
export function useMemberPhoto(
  member: Pick<Member, 'household_id' | 'avatar_mode' | 'photo_path'> | undefined,
): AvatarPhoto | undefined {
  const { data: urls } = useMemberPhotoUrls(member?.household_id);
  return member ? memberPhoto(member, urls) : undefined;
}

/** Funksjon som gir bildet for et medlem. For lister, der en hook per rad ikke går. */
export function useMemberPhotoLookup(householdId: string | undefined) {
  const { data: urls } = useMemberPhotoUrls(householdId);
  return (member: Pick<Member, 'avatar_mode' | 'photo_path'> | null | undefined) =>
    member ? memberPhoto(member, urls) : undefined;
}

export function useUploadMemberPhoto(householdId: string) {
  const onSuccess = useInvalidateMembers(householdId);
  return useMutation({
    mutationFn: ({ member, localUri }: { member: Member; localUri: string }) =>
      uploadMemberPhoto(member, localUri),
    onSuccess,
  });
}

export function useRemoveMemberPhoto(householdId: string) {
  const onSuccess = useInvalidateMembers(householdId);
  return useMutation({ mutationFn: removeMemberPhoto, onSuccess });
}

/** Voksen bytter figur/bilde for et medlem. */
export function useSetMemberAvatarMode(householdId: string) {
  const onSuccess = useInvalidateMembers(householdId);
  return useMutation({
    mutationFn: ({ memberId, mode }: { memberId: string; mode: AvatarMode }) =>
      setMemberAvatarMode(memberId, mode),
    onSuccess,
  });
}

/** Barnet bytter figur/bilde på sin egen profil. */
export function useSetMyAvatarMode(householdId: string) {
  const onSuccess = useInvalidateMembers(householdId);
  return useMutation({ mutationFn: setMyAvatarMode, onSuccess });
}

// ---------------------------------------------------------------------------
// Invitasjon av voksen
// ---------------------------------------------------------------------------

export function useActiveInvites(householdId: string) {
  return useQuery({
    queryKey: householdKeys.invites(householdId),
    queryFn: () => listActiveInvites(householdId),
  });
}

function useInvalidateInvites(householdId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: householdKeys.invites(householdId) });
}

export function useCreateInvite(householdId: string) {
  const onSuccess = useInvalidateInvites(householdId);
  return useMutation({ mutationFn: () => createInvite(householdId), onSuccess });
}

export function useRevokeInvite(householdId: string) {
  const onSuccess = useInvalidateInvites(householdId);
  return useMutation({ mutationFn: revokeInvite, onSuccess });
}

/** Ved suksess hentes husstanden på nytt, og app/(app)/_layout.tsx bytter til fanene. */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdKeys.mine }),
  });
}
