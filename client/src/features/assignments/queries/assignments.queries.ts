import type { SubmitInput } from '@shared/schemas/assignment-marking'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as assignments from '@/services/assignments.service'

export const assignmentKeys = {
  all: ['assignments'] as const,
  mine: () => ['assignments', 'mine'] as const,
  file: (submissionId: string) => ['assignments', 'file', submissionId] as const,
}

export const myAssignmentsQuery = () =>
  queryOptions({
    queryKey: assignmentKeys.mine(),
    queryFn: () => assignments.listMine(),
  })

/** A stored submission file (owner, assigned trainer or admin). The Blob never changes. */
export const submissionFileQuery = (submissionId: string) =>
  queryOptions({
    queryKey: assignmentKeys.file(submissionId),
    queryFn: () => assignments.getSubmissionFile(submissionId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

/** Checks and stores a chosen file in this browser; returns the upload id to submit with. */
export function uploadAssignmentFile(assignmentId: string, file: File) {
  return assignments.uploadFile(assignmentId, file)
}

export function useSubmitAssignment(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitInput) => assignments.submit(assignmentId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  })
}
