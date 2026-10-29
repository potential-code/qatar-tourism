import type { ProgrammeCode } from '@shared/constants'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '@/lib/api'
import * as enrolments from '@/services/enrolments.service'

/** Public catalogue reads (no session needed) and the learner's own enrolments. */

export type PublicProgramme = InferResponseType<
  typeof api.programmes.public.$get,
  200
>['items'][number]
export type ProgrammeDetail = InferResponseType<
  (typeof api.programmes.public)[':code']['$get'],
  200
>
export type PublicSession = InferResponseType<
  typeof api.programmes.public.sessions.$get,
  200
>['items'][number]
export type PublicTrainer = InferResponseType<
  typeof api.programmes.public.trainers.$get,
  200
>['items'][number]
export type TrainerDetail = InferResponseType<
  (typeof api.programmes.public.trainers)[':code']['$get'],
  200
>
export type OwnEnrolment = Awaited<
  ReturnType<typeof enrolments.listMyProgrammeEnrolments>
>['items'][number]

export const programmeKeys = {
  all: ['programmes'] as const,
  list: () => ['programmes', 'public', 'list'] as const,
  detail: (code: ProgrammeCode) => ['programmes', 'public', 'detail', code] as const,
  sessions: (programme?: ProgrammeCode) =>
    ['programmes', 'public', 'sessions', programme ?? 'all'] as const,
  trainers: () => ['programmes', 'public', 'trainers'] as const,
  trainer: (code: string) => ['programmes', 'public', 'trainer', code] as const,
  mine: () => ['programmes', 'me', 'enrolments'] as const,
}

export const programmesQuery = () =>
  queryOptions({
    queryKey: programmeKeys.list(),
    queryFn: async () => (await unwrap(api.programmes.public.$get())).items,
    staleTime: 5 * 60_000,
  })

export const programmeQuery = (code: ProgrammeCode) =>
  queryOptions({
    queryKey: programmeKeys.detail(code),
    queryFn: () => unwrap(api.programmes.public[':code'].$get({ param: { code } })),
    staleTime: 60_000,
  })

export const upcomingSessionsQuery = (programme?: ProgrammeCode) =>
  queryOptions({
    queryKey: programmeKeys.sessions(programme),
    queryFn: async () =>
      (await unwrap(api.programmes.public.sessions.$get({ query: programme ? { programme } : {} })))
        .items,
    staleTime: 30_000,
  })

export const trainersQuery = () =>
  queryOptions({
    queryKey: programmeKeys.trainers(),
    queryFn: async () => (await unwrap(api.programmes.public.trainers.$get())).items,
    staleTime: 5 * 60_000,
  })

export const trainerQuery = (code: string) =>
  queryOptions({
    queryKey: programmeKeys.trainer(code),
    queryFn: () => unwrap(api.programmes.public.trainers[':code'].$get({ param: { code } })),
    staleTime: 60_000,
  })

export const myEnrolmentsQuery = () =>
  queryOptions({
    queryKey: programmeKeys.mine(),
    queryFn: async () => (await enrolments.listMyProgrammeEnrolments()).items,
  })

export function useEnrol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: ProgrammeCode) => enrolments.enrolInProgramme(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: programmeKeys.all }),
  })
}
