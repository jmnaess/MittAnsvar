import { useMutation, useQueryClient } from '@tanstack/react-query';
import { displayKeys } from '../display/hooks';
import { householdKeys } from '../household/hooks';
import { createLinkCode, redeemLinkCode, unlinkDevice } from './api';

export function useCreateLinkCode() {
  return useMutation({ mutationFn: createLinkCode });
}

/** Etter innløsning hentes koblingen på nytt, og app/(app)/_layout.tsx viser riktig skjerm. */
export function useRedeemLinkCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: redeemLinkCode,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: householdKeys.mine }),
        queryClient.invalidateQueries({ queryKey: displayKeys.board }),
      ]),
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
