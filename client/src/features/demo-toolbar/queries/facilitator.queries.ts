import type { FacilitatorTarget } from '@shared/schemas/profile-account'
import { queryOptions, useMutation } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '@/lib/api'

export type FacilitatorStatus = InferResponseType<typeof api.profiles.facilitator.$get, 200>
export type FacilitatorTargetView = FacilitatorStatus['targets'][number]

/** Keyed by the signed-in user so a switch never shows the previous account's answer. */
export const facilitatorQuery = (userId: string) =>
  queryOptions({
    queryKey: ['demo-toolbar', userId],
    queryFn: () => unwrap(api.profiles.facilitator.$get()),
    staleTime: 5 * 60_000,
    retry: false,
  })

export function useFacilitatorSwitch() {
  return useMutation({
    mutationFn: (target: FacilitatorTarget) =>
      unwrap(api.profiles.facilitator.switch.$post({ json: { target } })),
  })
}
