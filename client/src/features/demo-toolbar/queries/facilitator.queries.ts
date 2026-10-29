import type { FacilitatorTarget } from '@shared/schemas/profile-account'
import { queryOptions, useMutation } from '@tanstack/react-query'
import * as auth from '@/services/auth.service'

export type FacilitatorStatus = Awaited<ReturnType<typeof auth.getFacilitatorStatus>>
export type FacilitatorTargetView = FacilitatorStatus['targets'][number]

/** Keyed by the signed-in user so a switch never shows the previous account's answer. */
export const facilitatorQuery = (userId: string) =>
  queryOptions({
    queryKey: ['demo-toolbar', userId],
    queryFn: auth.getFacilitatorStatus,
    staleTime: 5 * 60_000,
    retry: false,
  })

export function useFacilitatorSwitch() {
  return useMutation({
    mutationFn: (target: FacilitatorTarget) => auth.switchFacilitator(target),
  })
}
