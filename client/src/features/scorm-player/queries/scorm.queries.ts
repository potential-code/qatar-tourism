import type { ProgrammeCode } from '@shared/constants'
import type { ScormCommitBody } from '@shared/schemas/learning-engine'
import { queryOptions, useMutation } from '@tanstack/react-query'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import { api, unwrap } from '@/lib/api'

export const scormStateQuery = (programme: ProgrammeCode, code: string) =>
  queryOptions({
    queryKey: ['learning', 'scorm', programme, code],
    queryFn: () => unwrap(api.scorm[':code'].state.$get({ param: { code }, query: { programme } })),
    // Always launch from the latest saved resume point.
    staleTime: 0,
  })

export function useScormCommit(code: string) {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (body: ScormCommitBody) =>
      unwrap(api.scorm[':code'].commit.$post({ param: { code }, json: body })),
    onSuccess: (result) => {
      if (result.completedNow) void invalidate()
    },
  })
}

export function useScormRestart(code: string) {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (programme: ProgrammeCode) =>
      unwrap(api.scorm[':code'].restart.$post({ param: { code }, json: { programme } })),
    onSuccess: () => void invalidate(),
  })
}
