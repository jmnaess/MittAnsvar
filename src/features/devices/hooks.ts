import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdKeys } from '../household/hooks';
import { createLinkCode, redeemLinkCode, unlinkDevice } from './api';

export function useCreateLinkCode() {
  return useMutation({ mutationFn: createLinkCode });
}

/** Etter innløsning hentes husstanden på nytt, og app/(app)/_layout.tsx viser barnets faner. */
export function useRedeemLinkCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: redeemLinkCode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdKeys.mine }),
  });
}

/** Medlemslisten viser om barnet har enhet (auth_user_id), så den hentes på nytt. */
export function useUnlinkDevice(householdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unlinkDevice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdKeys.members(householdId) }),
  });
}
