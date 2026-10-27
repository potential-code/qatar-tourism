import type {
  MarkingCorrectionInput,
  MarkingDraftInput,
  MarkingFinalInput,
  MarkingQueueQuery,
} from '@shared/schemas/assignment-marking'
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export const markingKeys = {
  all: ['marking'] as const,
  queue: (query: MarkingQueueQuery) => ['marking', 'queue', query] as const,
  detail: (id: string) => ['marking', 'detail', id] as const,
}

export const markingQueueQuery = (query: MarkingQueueQuery) =>
  queryOptions({
    queryKey: markingKeys.queue(query),
    queryFn: () =>
      unwrap(
        api.assignments.marking.$get({
          query: {
            status: query.status,
            programme: query.programme,
            search: query.search || undefined,
            page: String(query.page),
            pageSize: String(query.pageSize),
          },
        }),
      ),
    placeholderData: keepPreviousData,
  })

export const markingDetailQuery = (id: string) =>
  queryOptions({
    queryKey: markingKeys.detail(id),
    queryFn: () => unwrap(api.assignments.marking[':id'].$get({ param: { id } })),
  })

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: markingKeys.all })
}

export function useSaveDraft(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: MarkingDraftInput) =>
      unwrap(api.assignments.marking[':id'].draft.$post({ param: { id }, json: input })),
    onSuccess: invalidate,
  })
}

export function useFinalise(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: MarkingFinalInput) =>
      unwrap(api.assignments.marking[':id'].finalise.$post({ param: { id }, json: input })),
    onSuccess: invalidate,
  })
}

export function useCorrect(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: MarkingCorrectionInput) =>
      unwrap(api.assignments.marking[':id'].correct.$post({ param: { id }, json: input })),
    onSuccess: invalidate,
  })
}
