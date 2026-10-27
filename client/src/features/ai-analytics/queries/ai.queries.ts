import type { AnalyticsAnswer } from '@shared/schemas/admin-ai'
import { queryOptions, useMutation } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export const promptsQuery = () =>
  queryOptions({
    queryKey: ['ai-analytics', 'prompts'] as const,
    queryFn: () => unwrap(api['ai-analytics'].prompts.$get()),
    staleTime: Number.POSITIVE_INFINITY,
  })

/** Asks the read-only Demo analytics assistant one question. */
export function useAsk() {
  return useMutation({
    mutationFn: async (question: string) =>
      (await unwrap(api['ai-analytics'].ask.$post({ json: { question } }))) as AnalyticsAnswer,
  })
}
