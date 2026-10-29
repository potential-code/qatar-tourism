import type { Competency, ProgrammeCode } from '@shared/constants'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import * as assessments from '@/services/assessments.service'

export type AssessmentKind = assessments.AssessmentKind

export const assessmentsOverviewQuery = (programme: ProgrammeCode) =>
  queryOptions({
    queryKey: ['assessments', programme],
    queryFn: () => assessments.overview(programme),
  })

export const assessmentStateQuery = (programme: ProgrammeCode, kind: AssessmentKind) =>
  queryOptions({
    queryKey: ['assessments', programme, kind],
    queryFn: () => assessments.getState(programme, kind),
  })

export function useStartAssessment(programme: ProgrammeCode, kind: AssessmentKind) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => assessments.start(programme, kind),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments', programme, kind] }),
  })
}

export function useSaveAnswer() {
  return useMutation({
    mutationFn: (input: { attemptId: string; competency: Competency; option: 'A' | 'B' | 'C' }) =>
      assessments.saveAnswer(input),
  })
}

export function useSubmitAssessment() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (attemptId: string) => assessments.submit(attemptId),
    onSuccess: () => void invalidate(),
  })
}
