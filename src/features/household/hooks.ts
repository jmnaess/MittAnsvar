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
  updateChild,
  updateHousehold,
} from './api';
import type { ChildInput, FeedbackTone } from './types';

// Nøkler for cachen. Etter en endring «invaliderer» vi nøkkelen, så dataene hentes på nytt.
export const householdKeys = {
  mine: ['household'] as const,
  members: (householdId: string) => ['members', householdId] as const,
  invites: (householdId: string) => ['invites', householdId] as const,
};

export function useMyHousehold() {
  return useQuery({ queryKey: householdKeys.mine, queryFn: getMyHousehold });
}

export function useMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: householdKeys.members(householdId ?? ''),
    queryFn: () => listMembers(householdId!),
    enabled: !!householdId,
  });
}

/**
 * Invaliderer IKKE husstanden. Oppstarten gjør det selv når barnesteget er ferdig,
 * ellers bytter appen til fanene før brukeren har fått lagt til barn.
 */
export function useCreateHousehold() {
  return useMutation({ mutationFn: createHousehold });
}

export function useUpdateHousehold(householdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: { name?: string; feedback_tone?: FeedbackTone }) =>
      updateHousehold(householdId, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdKeys.mine }),
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

export function useDeleteChild(householdId: string) {
  const onSuccess = useInvalidateMembers(householdId);
  return useMutation({ mutationFn: deleteChild, onSuccess });
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
