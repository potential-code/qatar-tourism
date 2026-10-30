import type { ProgrammeCode } from '@shared/constants'
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

/** Starts an attempt in the learner's portal language (the question variant it is served in). */
export function useStartAssessment(programme: ProgrammeCode, kind: AssessmentKind) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (language: string) => assessments.start(programme, kind, language),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments', programme, kind] }),
  })
}

export function useSaveAnswer() {
  return useMutation({
    mutationFn: (input: assessments.SaveAnswerInput) => assessments.saveAnswer(input),
  })
}

export function useSubmitAssessment() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (attemptId: string) => assessments.submit(attemptId),
    onSuccess: () => void invalidate(),
  })
}

/** The timer reached zero: the service submits the saved answers once the deadline has passed. */
export function useExpireAttempt() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (attemptId: string) => assessments.expire(attemptId),
    onSuccess: (data) => {
      if (data.expired) void invalidate()
    },
  })
}
