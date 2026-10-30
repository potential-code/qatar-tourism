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

export function useScormCommit(code: string) {
  const invalidate = useInvalidateLearning()
  return useMutation({
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
