import type { Competency, ProgrammeCode } from '@shared/constants'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import { api, unwrap } from '@/lib/api'

export type AssessmentKind = 'pre' | 'post' | 'formative'

export const assessmentsOverviewQuery = (programme: ProgrammeCode) =>
  queryOptions({
    queryKey: ['assessments', programme],
    queryFn: () => unwrap(api.assessments[':programme'].$get({ param: { programme } })),
  })

export const assessmentStateQuery = (programme: ProgrammeCode, kind: AssessmentKind) =>
  queryOptions({
    queryKey: ['assessments', programme, kind],
    queryFn: () =>
      unwrap(api.assessments[':programme'][':kind'].$get({ param: { programme, kind } })),
  })

export function useStartAssessment(programme: ProgrammeCode, kind: AssessmentKind) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      unwrap(api.assessments[':programme'][':kind'].start.$post({ param: { programme, kind } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments', programme, kind] }),
  })
}

export function useSaveAnswer() {
  return useMutation({
    mutationFn: (input: { attemptId: string; competency: Competency; option: 'A' | 'B' | 'C' }) =>
      unwrap(
        api.assessments.attempts[':id'].answer.$patch({
          param: { id: input.attemptId },
          json: { competency: input.competency, option: input.option },
        }),
      ),
  })
}

export function useSubmitAssessment() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (attemptId: string) =>
      unwrap(api.assessments.attempts[':id'].submit.$post({ param: { id: attemptId } })),
    onSuccess: () => void invalidate(),
  })
}
