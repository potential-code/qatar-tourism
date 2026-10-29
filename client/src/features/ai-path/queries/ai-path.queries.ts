import type { ProgrammeCode } from '@shared/constants'
import { queryOptions, useMutation } from '@tanstack/react-query'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import * as aiPath from '@/services/ai-path.service'

export const recommendationQuery = (programme: ProgrammeCode) =>
  queryOptions({
    queryKey: ['ai-path', programme],
    queryFn: () => aiPath.getRecommendation(programme),
  })

export function useAcceptPath() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (programme: ProgrammeCode) => aiPath.acceptPath(programme),
    onSuccess: () => void invalidate(),
  })
}
