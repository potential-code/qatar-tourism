import type { ProgrammeCode } from '@shared/constants'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as catalogue from '@/services/catalogue.service'
import * as programmeEnrolment from '@/services/programme-enrolment.service'

/** Public catalogue reads (no session needed) and the learner's own enrolments. */

export type {
  ProgrammeDetail,
  PublicProgramme,
  PublicSession,
  PublicTrainer,
  TrainerDetail,
} from '@/services/catalogue.service'
export type { OwnEnrolment } from '@/services/programme-enrolment.service'

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
    queryFn: catalogue.listProgrammes,
    staleTime: 5 * 60_000,
  })

export const programmeQuery = (code: ProgrammeCode) =>
  queryOptions({
    queryKey: programmeKeys.detail(code),
    queryFn: () => catalogue.getProgramme(code),
    staleTime: 60_000,
  })

export const upcomingSessionsQuery = (programme?: ProgrammeCode) =>
  queryOptions({
    queryKey: programmeKeys.sessions(programme),
    queryFn: () => catalogue.listUpcomingSessions(programme),
    staleTime: 30_000,
  })

export const trainersQuery = () =>
  queryOptions({
    queryKey: programmeKeys.trainers(),
    queryFn: catalogue.listTrainers,
    staleTime: 5 * 60_000,
  })

export const trainerQuery = (code: string) =>
  queryOptions({
    queryKey: programmeKeys.trainer(code),
    queryFn: () => catalogue.getTrainer(code),
    staleTime: 60_000,
  })

export const myEnrolmentsQuery = () =>
  queryOptions({
    queryKey: programmeKeys.mine(),
    queryFn: programmeEnrolment.listMyEnrolments,
  })

export function useEnrol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: ProgrammeCode) => programmeEnrolment.enrolSelf(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: programmeKeys.all }),
  })
}
