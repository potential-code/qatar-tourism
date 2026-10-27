import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { unwrap } from '@/lib/api'
import { adminApi } from '../../hub/queries/admin-api'

export const adminAssessmentsQuery = () =>
  queryOptions({
    queryKey: ['admin', 'assessments'],
    queryFn: () => unwrap(adminApi.assessments.$get()),
  })

export type AssessmentItem = Awaited<
  ReturnType<NonNullable<ReturnType<typeof adminAssessmentsQuery>['queryFn']>>
>['items'][number]

export function useUpdatePassMark(assessmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { passPercent: number | null; reason: string }) =>
      unwrap(
        adminApi.assessments[':assessmentId'].$patch({ param: { assessmentId }, json: input }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  })
}
