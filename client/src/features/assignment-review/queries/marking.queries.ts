import type {
  MarkingCorrectionInput,
  MarkingDraftInput,
  MarkingFinalInput,
  MarkingQueueQuery,
} from '@shared/schemas/assignment-marking'
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as marking from '@/services/assignments.marking.service'

export const markingKeys = {
  all: ['marking'] as const,
  queue: (query: MarkingQueueQuery) => ['marking', 'queue', query] as const,
  detail: (id: string) => ['marking', 'detail', id] as const,
}

export const markingQueueQuery = (query: MarkingQueueQuery) =>
  queryOptions({
    queryKey: markingKeys.queue(query),
    queryFn: () => marking.getQueue({ ...query, search: query.search || undefined }),
    placeholderData: keepPreviousData,
  })

export const markingDetailQuery = (id: string) =>
  queryOptions({
    queryKey: markingKeys.detail(id),
    queryFn: () => marking.getDetail(id),
  })

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: markingKeys.all })
}

export function useSaveDraft(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: MarkingDraftInput) => marking.saveDraft(id, input),
    onSuccess: invalidate,
  })
}

export function useFinalise(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: MarkingFinalInput) => marking.finalise(id, input),
    onSuccess: invalidate,
  })
}

export function useCorrect(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: MarkingCorrectionInput) => marking.correct(id, input),
    onSuccess: invalidate,
  })
}
