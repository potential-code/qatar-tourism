import type { ProgrammeCode } from '@shared/constants'
import type { ScormCommitBody } from '@shared/schemas/learning-engine'
import { queryOptions, useMutation } from '@tanstack/react-query'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import * as scorm from '@/services/scorm.service'

export const scormStateQuery = (programme: ProgrammeCode, code: string, packageId?: string) =>
  queryOptions({
    queryKey: ['learning', 'scorm', programme, code, packageId ?? null],
    queryFn: () => scorm.getState(programme, code, packageId),
    // Always launch from the latest saved resume point.
    staleTime: 0,
  })

/**
 * Commits run one after another: a learner can move between screens faster than a save returns, and
 * two commits in flight can land out of order, which would store an earlier bookmark last.
 */
export function useScormCommit(code: string) {
  const invalidate = useInvalidateLearning()
  return useMutation({
    scope: { id: `scorm-commit-${code}` },
    mutationFn: (body: ScormCommitBody) => scorm.commit(code, body),
    onSuccess: (result) => {
      if (result.completedNow) void invalidate()
    },
  })
}

export function useScormRestart(code: string, packageId?: string) {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (programme: ProgrammeCode) => scorm.restart(programme, code, packageId),
    onSuccess: () => void invalidate(),
  })
}
