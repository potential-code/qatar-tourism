import type { ProgrammeCode } from '@shared/constants'
import { queryOptions, useMutation } from '@tanstack/react-query'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import { api, unwrap } from '@/lib/api'

export const recommendationQuery = (programme: ProgrammeCode) =>
  queryOptions({
    queryKey: ['ai-path', programme],
    queryFn: () => unwrap(api['ai-path'][':programme'].$get({ param: { programme } })),
  })

export function useAcceptPath() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (programme: ProgrammeCode) =>
      unwrap(api['ai-path'][':programme'].accept.$post({ param: { programme } })),
    onSuccess: () => void invalidate(),
  })
}
