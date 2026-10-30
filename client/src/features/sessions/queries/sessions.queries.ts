import type { BookingChangeRequestInput } from '@shared/schemas/booking-rsvp'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as enrolment from '@/services/programme-enrolment.service'
import * as rsvps from '@/services/rsvps.service'
import * as waitlist from '@/services/rsvps-waitlist.service'

/** Learner booking queries (brief §6). The only place this feature calls the services. */
export const sessionKeys = {
  all: ['learner-sessions'] as const,
  catalogue: () => [...sessionKeys.all, 'catalogue'] as const,
  mine: () => [...sessionKeys.all, 'mine'] as const,
  requests: () => [...sessionKeys.all, 'requests'] as const,
}

export const catalogueQuery = () =>
  queryOptions({
    queryKey: sessionKeys.catalogue(),
    queryFn: () => rsvps.getCatalogue(),
  })

export const mySessionsQuery = () =>
  queryOptions({
    queryKey: sessionKeys.mine(),
    queryFn: () => rsvps.getMySessions(),
  })

export const myRequestsQuery = () =>
  queryOptions({
    queryKey: sessionKeys.requests(),
    queryFn: () => enrolment.listMyRequests(),
  })

function useRefreshAfter() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sessionKeys.all })
}

export function useBookSession() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { sessionId: string; joinWaitlist: boolean }) => rsvps.bookSession(input),
    onSettled: refresh,
  })
}

export function useMoveBooking() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { rsvpId: string; toSessionId: string }) => rsvps.moveBooking(input),
    onSettled: refresh,
  })
}

export function useCancelBooking() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { rsvpId: string; reason?: string }) =>
      rsvps.cancelBooking(input.rsvpId, { reason: input.reason }),
    onSettled: refresh,
  })
}

export function useRequestChange() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { rsvpId: string } & BookingChangeRequestInput) =>
      rsvps.requestBookingChange(input.rsvpId, { kind: input.kind, reason: input.reason }),
    onSettled: refresh,
  })
}

/** Accept or decline a pending seat offer. */
export function useRespondToOffer() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { rsvpId: string; decision: 'accept' | 'decline' }) =>
      waitlist.respondToOffer(input.rsvpId, input.decision),
    onSettled: refresh,
  })
}

export function useLeaveWaitlist() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (rsvpId: string) => waitlist.leaveWaitlist(rsvpId),
    onSettled: refresh,
  })
}

export function useRequestEnrolment() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { sessionId?: string; note?: string } = {}) =>
      enrolment.requestEnrolment('A', input),
    onSettled: refresh,
  })
}

export function useReplyToInfoRequest() {
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: { code: string; note: string }) =>
      enrolment.respondToInfoRequest(input.code, input.note),
    onSettled: refresh,
  })
}
