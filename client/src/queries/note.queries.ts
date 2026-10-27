import type { ListQuery, NoteInput, NotePatch } from '@shared/schemas'
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '@/lib/api'

export type Note = InferResponseType<(typeof api.notes)[':id']['$get'], 200>
export type NotePage = InferResponseType<typeof api.notes.$get, 200>

/** Query keys for the notes domain. Invalidate `noteKeys.all` after any write. */
export const noteKeys = {
  all: ['notes'] as const,
  list: (query: ListQuery) => ['notes', 'list', query] as const,
  stats: () => ['notes', 'stats'] as const,
}

export const notesListQuery = (query: ListQuery) =>
  queryOptions({
    queryKey: noteKeys.list(query),
    queryFn: () =>
      unwrap(
        api.notes.$get({
          query: { page: String(query.page), pageSize: String(query.pageSize) },
        }),
      ),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })

export const noteStatsQuery = () =>
  queryOptions({
    queryKey: noteKeys.stats(),
    queryFn: () => unwrap(api.notes.stats.$get()),
  })

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NoteInput) => unwrap(api.notes.$post({ json: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NotePatch }) =>
      unwrap(api.notes[':id'].$patch({ param: { id }, json: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => unwrap(api.notes[':id'].$delete({ param: { id } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  })
}
