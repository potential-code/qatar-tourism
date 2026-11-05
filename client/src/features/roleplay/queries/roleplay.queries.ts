import type { ProgrammeCode } from '@shared/constants'
import type { PracticeAttemptInput, PracticeTurnInput } from '@shared/schemas/practice-roleplay'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as roleplay from '@/services/roleplay.service'

export const roleplayKeys = {
  all: ['roleplay'] as const,
  overview: (programme?: ProgrammeCode) => ['roleplay', 'overview', programme ?? 'all'] as const,
  attempts: (scenarioKey?: string, programme?: ProgrammeCode) =>
    ['roleplay', 'attempts', scenarioKey ?? 'all', programme ?? 'all'] as const,
  attempt: (id: string) => ['roleplay', 'attempt', id] as const,
  demonstration: (key: string) => ['roleplay', 'demonstration', key] as const,
}

/** Scores for `programme` (the active one); the enrolment list always has every programme. */
export const practiceOverviewQuery = (programme?: ProgrammeCode) =>
  queryOptions({
    queryKey: roleplayKeys.overview(programme),
    queryFn: () => roleplay.getOverview(programme),
  })

export const practiceAttemptsQuery = (scenarioKey?: string, programme?: ProgrammeCode) =>
  queryOptions({
    queryKey: roleplayKeys.attempts(scenarioKey, programme),
    queryFn: () => roleplay.listAttempts(scenarioKey, programme),
  })

export const practiceAttemptQuery = (id: string) =>
  queryOptions({
    queryKey: roleplayKeys.attempt(id),
    queryFn: () => roleplay.getAttempt(id),
  })

export const demonstrationQuery = (key: string) =>
  queryOptions({
    queryKey: roleplayKeys.demonstration(key),
    queryFn: () => roleplay.getDemonstration(key),
    staleTime: Number.POSITIVE_INFINITY,
  })

/** The scripted visitor's next line. Not cached: each call answers the conversation so far. */
export function requestVisitorTurn(input: PracticeTurnInput) {
  return roleplay.nextTurn(input)
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PracticeAttemptInput) => roleplay.createAttempt(input),
    onSuccess: (attempt) => {
      queryClient.setQueryData(roleplayKeys.attempt(attempt.id), attempt)
      return queryClient.invalidateQueries({ queryKey: roleplayKeys.all })
    },
  })
}
