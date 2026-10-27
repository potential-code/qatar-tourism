import type { AdminProgrammeUpdate } from '@shared/schemas/admin-programmes'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { unwrap } from '@/lib/api'
import { adminApi } from '../../hub/queries/admin-api'

/** Programme management data (brief §14). The only place this feature calls the API. */

const programmes = adminApi.programmes

export const programmeKeys = {
  all: ['admin-programmes'] as const,
  list: () => ['admin-programmes', 'list'] as const,
  detail: (id: string) => ['admin-programmes', 'detail', id] as const,
}

export const programmesListQuery = () =>
  queryOptions({ queryKey: programmeKeys.list(), queryFn: () => unwrap(programmes.$get()) })

export const programmeDetailQuery = (programmeId: string) =>
  queryOptions({
    queryKey: programmeKeys.detail(programmeId),
    queryFn: () => unwrap(programmes[':programmeId'].$get({ param: { programmeId } })),
  })

export function useUpdateProgramme(programmeId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminProgrammeUpdate) =>
      unwrap(programmes[':programmeId'].$patch({ param: { programmeId }, json: input })),
    onSuccess: () => client.invalidateQueries({ queryKey: programmeKeys.all }),
  })
}
