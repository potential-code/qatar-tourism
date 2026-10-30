import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as admin from '@/services/assessments/admin'

export type {
  AttemptFilter,
  AttemptListItem,
  QuestionInput,
  QuestionListItem,
  RuleConfig,
} from '@/services/assessments/admin'

export const questionsQuery = () =>
  queryOptions({ queryKey: ['admin', 'assessments', 'questions'], queryFn: admin.listQuestions })

export const rulesQuery = () =>
  queryOptions({ queryKey: ['admin', 'assessments', 'rules'], queryFn: admin.listRules })

export const attemptsQuery = (filter: admin.AttemptFilter) =>
  queryOptions({
    queryKey: ['admin', 'assessments', 'attempts', filter],
    queryFn: () => admin.listAttempts(filter),
    placeholderData: keepPreviousData,
  })

export const attemptDetailQuery = (attemptId: string | null) =>
  queryOptions({
    queryKey: ['admin', 'assessments', 'attempt', attemptId],
    queryFn: () => admin.getAttemptDetail(attemptId as string),
    enabled: attemptId !== null,
  })

/** Every assessment change refreshes the admin lists and the reports that read them. */
function useAssessmentMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export const useSaveQuestion = () => useAssessmentMutation(admin.saveQuestion)
export const usePublishQuestion = () => useAssessmentMutation(admin.publishQuestion)
export const usePublishRule = () =>
  useAssessmentMutation((input: { config: admin.RuleConfig; reason: string }) =>
    admin.publishRule(input.config, input.reason),
  )
export const useGrantAttempt = () => useAssessmentMutation(admin.grantExtraAttempt)

export const previewRule = admin.previewRule

export type RuleItem = Awaited<ReturnType<typeof admin.listRules>>['items'][number]
