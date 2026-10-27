import type { SubmitInput } from '@shared/schemas/assignment-marking'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export const assignmentKeys = {
  all: ['assignments'] as const,
  mine: () => ['assignments', 'mine'] as const,
}

export const myAssignmentsQuery = () =>
  queryOptions({
    queryKey: assignmentKeys.mine(),
    queryFn: () => unwrap(api.assignments.mine.$get()),
  })

export function useSubmitAssignment(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitInput) =>
      unwrap(
        api.assignments[':id'].submissions.$post({ param: { id: assignmentId }, json: input }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  })
}
