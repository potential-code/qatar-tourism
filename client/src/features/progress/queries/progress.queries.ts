import type { ProgrammeCode } from '@shared/constants'
import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export const historyQuery = (programme: ProgrammeCode) =>
  queryOptions({
    queryKey: ['progress', 'history', programme],
    queryFn: () => unwrap(api.progress[':programme'].history.$get({ param: { programme } })),
  })
