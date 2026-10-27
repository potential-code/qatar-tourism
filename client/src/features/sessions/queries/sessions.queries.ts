import type { BookingChangeRequestInput } from '@shared/schemas/booking-rsvp'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

/** Learner booking queries (brief §6). The only place this feature calls the API. */
export const sessionKeys = {
  all: ['learner-sessions'] as const,
  catalogue: () => [...sessionKeys.all, 'catalogue'] as const,
  mine: () => [...sessionKeys.all, 'mine'] as const,
}

export const catalogueQuery = () =>
  queryOptions({
    queryKey: sessionKeys.catalogue(),
    queryFn: () => unwrap(api.rsvps.catalogue.$get()),
  })

export const mySessionsQuery = () =>
  queryOptions({
    queryKey: sessionKeys.mine(),
    queryFn: () => unwrap(api.rsvps.mine.$get()),
  })

function useRefreshAfter() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sessionKeys.all })
}

export function useBookSession() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { sessionId: string; joinWaitlist: boolean }) =>
      unwrap(api.rsvps.$post({ json: input })),
    onSettled: refresh,
  })
}

export function useMoveBooking() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { rsvpId: string; toSessionId: string }) =>
      unwrap(api.rsvps.move.$post({ json: input })),
    onSettled: refresh,
  })
}

export function useCancelBooking() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { rsvpId: string; reason?: string }) =>
      unwrap(
        api.rsvps[':id'].cancel.$post({
          param: { id: input.rsvpId },
          json: { reason: input.reason },
        }),
      ),
    onSettled: refresh,
  })
}

export function useRequestChange() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { rsvpId: string } & BookingChangeRequestInput) =>
      unwrap(
        api.rsvps[':id']['request-change'].$post({
          param: { id: input.rsvpId },
          json: { kind: input.kind, reason: input.reason },
        }),
      ),
    onSettled: refresh,
  })
}
