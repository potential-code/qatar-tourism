import type { PracticeAttemptInput, PracticeTurnInput } from '@shared/schemas/practice-roleplay'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export const roleplayKeys = {
  all: ['roleplay'] as const,
  overview: () => ['roleplay', 'overview'] as const,
  attempts: (scenarioKey?: string) => ['roleplay', 'attempts', scenarioKey ?? 'all'] as const,
  attempt: (id: string) => ['roleplay', 'attempt', id] as const,
  demonstration: (key: string) => ['roleplay', 'demonstration', key] as const,
}

export const practiceOverviewQuery = () =>
  queryOptions({
    queryKey: roleplayKeys.overview(),
    queryFn: () => unwrap(api.roleplay.overview.$get()),
  })

export const practiceAttemptsQuery = (scenarioKey?: string) =>
  queryOptions({
    queryKey: roleplayKeys.attempts(scenarioKey),
    queryFn: () =>
      unwrap(api.roleplay.attempts.$get({ query: scenarioKey ? { scenarioKey } : {} })),
  })

export const practiceAttemptQuery = (id: string) =>
  queryOptions({
    queryKey: roleplayKeys.attempt(id),
    queryFn: () => unwrap(api.roleplay.attempts[':id'].$get({ param: { id } })),
  })

export const demonstrationQuery = (key: string) =>
  queryOptions({
    queryKey: roleplayKeys.demonstration(key),
    queryFn: () => unwrap(api.roleplay.scenarios[':key'].demonstration.$get({ param: { key } })),
    staleTime: Number.POSITIVE_INFINITY,
  })

/** The scripted visitor's next line. Not cached: each call answers the conversation so far. */
export function requestVisitorTurn(input: PracticeTurnInput) {
  return unwrap(api.roleplay.turn.$post({ json: input }))
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PracticeAttemptInput) =>
      unwrap(api.roleplay.attempts.$post({ json: input })),
    onSuccess: (attempt) => {
      queryClient.setQueryData(roleplayKeys.attempt(attempt.id), attempt)
      return queryClient.invalidateQueries({ queryKey: roleplayKeys.all })
    },
  })
}
