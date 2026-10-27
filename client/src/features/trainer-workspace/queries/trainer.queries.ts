import type { SessionStatus } from '@shared/constants'
import type { SessionScoreInput } from '@shared/schemas/session'
import type { AttendanceUpdateInput, SessionUpdateInput } from '@shared/schemas/trainer-ops'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

/** Trainer workspace queries (brief §10–11). The only place this feature calls the API. */
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
    queryFn: () => unwrap(api.sessions.overview.$get()),
  })

export const trainerSessionsQuery = (status?: SessionStatus) =>
  queryOptions({
    queryKey: trainerKeys.sessions(status),
    queryFn: () => unwrap(api.sessions.$get({ query: { status } })),
  })

export const sessionDetailQuery = (id: string) =>
  queryOptions({
    queryKey: trainerKeys.session(id),
    queryFn: () => unwrap(api.sessions[':id'].$get({ param: { id } })),
  })

export const impactQuery = (id: string, startsAt?: string, endsAt?: string) =>
  queryOptions({
    queryKey: trainerKeys.impact(id, startsAt, endsAt),
    queryFn: () =>
      unwrap(api.sessions[':id'].impact.$get({ param: { id }, query: { startsAt, endsAt } })),
  })

export const formOptionsQuery = () =>
  queryOptions({
    queryKey: trainerKeys.formOptions(),
    queryFn: () => unwrap(api.sessions['form-options'].$get()),
    staleTime: 5 * 60_000,
  })

export const rosterQuery = (sessionId: string) =>
  queryOptions({
    queryKey: trainerKeys.roster(sessionId),
    queryFn: () =>
      unwrap(api.attendance.sessions[':sessionId'].roster.$get({ param: { sessionId } })),
  })

export const learnersQuery = () =>
  queryOptions({
    queryKey: trainerKeys.learners(),
    queryFn: () => unwrap(api.attendance.learners.$get()),
  })

export const profileQuery = () =>
  queryOptions({
    queryKey: trainerKeys.profile(),
    queryFn: () => unwrap(api.sessions.profile.$get()),
  })

export const resourcesQuery = () =>
  queryOptions({
    queryKey: trainerKeys.resources(),
    queryFn: () => unwrap(api.sessions.resources.$get()),
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
      unwrap(api.sessions.$post({ json: input })),
    onSuccess: refresh,
  })
}

export function useUpdateSession(id: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: SessionUpdateInput) =>
      unwrap(api.sessions[':id'].$patch({ param: { id }, json: input })),
    onSuccess: refresh,
  })
}

export function usePublishSession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => unwrap(api.sessions[':id'].publish.$post({ param: { id } })),
    onSuccess: refresh,
  })
}

export function useCompleteSession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => unwrap(api.sessions[':id'].complete.$post({ param: { id } })),
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
    mutationFn: ({ id, ...json }: RescheduleRequest) =>
      unwrap(api.sessions[':id'].reschedule.$post({ param: { id }, json })),
    onSuccess: refresh,
  })
}

export function useCancelSession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, ...json }: { id: string; reason: string; idempotencyKey: string }) =>
      unwrap(api.sessions[':id'].cancel.$post({ param: { id }, json })),
    onSuccess: refresh,
  })
}

export function useMarkAttendance() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: AttendanceUpdateInput) =>
      unwrap(api.attendance.mark.$post({ json: input })),
    onSuccess: refresh,
  })
}

export function useRecordScore() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: SessionScoreInput) => unwrap(api.attendance.score.$post({ json: input })),
    onSuccess: refresh,
  })
}
