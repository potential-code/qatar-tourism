import type { SessionStatus } from '@shared/constants'
import type { SessionScoreInput } from '@shared/schemas/session'
import type { AttendanceUpdateInput, SessionUpdateInput } from '@shared/schemas/trainer-ops'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as attendance from '@/services/attendance.service'
import * as sessions from '@/services/sessions.service'

/** Trainer workspace queries (brief §10–11). The only place this feature calls the services. */
export const trainerKeys = {
  all: ['trainer'] as const,
  overview: () => [...trainerKeys.all, 'overview'] as const,
  sessions: (status?: SessionStatus) => [...trainerKeys.all, 'sessions', status ?? 'all'] as const,
  session: (id: string) => [...trainerKeys.all, 'session', id] as const,
  impact: (id: string, startsAt?: string, endsAt?: string) =>
    [...trainerKeys.all, 'impact', id, startsAt ?? '', endsAt ?? ''] as const,
  formOptions: () => [...trainerKeys.all, 'form-options'] as const,
  roster: (id: string) => [...trainerKeys.all, 'roster', id] as const,
  learners: () => [...trainerKeys.all, 'learners'] as const,
  profile: () => [...trainerKeys.all, 'profile'] as const,
  resources: () => [...trainerKeys.all, 'resources'] as const,
}

export const overviewQuery = () =>
  queryOptions({
    queryKey: trainerKeys.overview(),
    queryFn: () => sessions.getOverview(),
  })

export const trainerSessionsQuery = (status?: SessionStatus) =>
  queryOptions({
    queryKey: trainerKeys.sessions(status),
    queryFn: () => sessions.listSessions(status),
  })

export const sessionDetailQuery = (id: string) =>
  queryOptions({
    queryKey: trainerKeys.session(id),
    queryFn: () => sessions.getSessionDetail(id),
  })

export const impactQuery = (id: string, startsAt?: string, endsAt?: string) =>
  queryOptions({
    queryKey: trainerKeys.impact(id, startsAt, endsAt),
    queryFn: () => sessions.getImpact(id, { startsAt, endsAt }),
  })

export const formOptionsQuery = () =>
  queryOptions({
    queryKey: trainerKeys.formOptions(),
    queryFn: () => sessions.getFormOptions(),
    staleTime: 5 * 60_000,
  })

export const rosterQuery = (sessionId: string) =>
  queryOptions({
    queryKey: trainerKeys.roster(sessionId),
    queryFn: () => attendance.getRoster(sessionId),
  })

export const learnersQuery = () =>
  queryOptions({
    queryKey: trainerKeys.learners(),
    queryFn: () => attendance.getAssignedLearners(),
  })

export const profileQuery = () =>
  queryOptions({
    queryKey: trainerKeys.profile(),
    queryFn: () => sessions.getTrainerProfile(),
  })

export const resourcesQuery = () =>
  queryOptions({
    queryKey: trainerKeys.resources(),
    queryFn: () => sessions.getTrainerResources(),
  })

/** Any trainer write can move counts on several screens, so refresh the whole workspace. */
function useRefresh() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trainerKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ])
}

export function useCreateSession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { session: SessionUpdateInput; publish: boolean }) =>
      sessions.createSession(input),
    onSuccess: refresh,
  })
}

export function useUpdateSession(id: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: SessionUpdateInput) => sessions.updateSession(id, input),
    onSuccess: refresh,
  })
}

export function usePublishSession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => sessions.publishSession(id),
    onSuccess: refresh,
  })
}

export function useCompleteSession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => sessions.completeSession(id),
    onSuccess: refresh,
  })
}

export type RescheduleRequest = {
  id: string
  startsAt: string
  endsAt: string
  reason: string
  venue?: string | null
  meetingRef?: string | null
  idempotencyKey: string
}

export function useRescheduleSession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, ...input }: RescheduleRequest) => sessions.rescheduleSession(id, input),
    onSuccess: refresh,
  })
}

export function useCancelSession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; reason: string; idempotencyKey: string }) =>
      sessions.cancelSession(id, input),
    onSuccess: refresh,
  })
}

export function useMarkAttendance() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: AttendanceUpdateInput) => attendance.markAttendance(input),
    onSuccess: refresh,
  })
}

export function useRecordScore() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: SessionScoreInput) => attendance.recordScore(input),
    onSuccess: refresh,
  })
}
