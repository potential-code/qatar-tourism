import { queryOptions, useMutation } from '@tanstack/react-query'
import * as aiAnalytics from '@/services/ai-analytics.service'

export const promptsQuery = () =>
  queryOptions({
    queryKey: ['ai-analytics', 'prompts'] as const,
    queryFn: () => aiAnalytics.listPrompts(),
    staleTime: Number.POSITIVE_INFINITY,
  })

/** Asks the read-only Demo analytics assistant one question. */
export function useAsk() {
  return useMutation({
    mutationFn: (question: string) => aiAnalytics.ask({ question }),
  })
}
