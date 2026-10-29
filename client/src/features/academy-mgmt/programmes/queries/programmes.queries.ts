import type { AdminProgrammeUpdate } from '@shared/schemas/admin-programmes'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as programmes from '@/services/admin/programmes.service'

/** Programme management data (brief §14). The only place this feature calls a service. */

export const programmeKeys = {
  all: ['admin-programmes'] as const,
  list: () => ['admin-programmes', 'list'] as const,
  detail: (id: string) => ['admin-programmes', 'detail', id] as const,
}

export const programmesListQuery = () =>
  queryOptions({ queryKey: programmeKeys.list(), queryFn: () => programmes.listProgrammes() })

export const programmeDetailQuery = (programmeId: string) =>
  queryOptions({
    queryKey: programmeKeys.detail(programmeId),
    queryFn: () => programmes.getProgramme(programmeId),
  })

export function useUpdateProgramme(programmeId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminProgrammeUpdate) => programmes.updateProgramme(programmeId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: programmeKeys.all }),
  })
}
