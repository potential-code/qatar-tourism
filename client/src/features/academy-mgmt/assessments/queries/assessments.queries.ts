import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as assessments from '@/services/admin/assessments.service'

export type { AssessmentItem } from '@/services/admin/assessments.service'

export const adminAssessmentsQuery = () =>
  queryOptions({
    queryKey: ['admin', 'assessments'],
    queryFn: () => assessments.listAssessments(),
  })

export function useUpdatePassMark(assessmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { passPercent: number | null; reason: string }) =>
      assessments.updatePassMark(assessmentId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  })
}
