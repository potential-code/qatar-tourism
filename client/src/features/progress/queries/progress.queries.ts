import type { ProgrammeCode } from '@shared/constants'
import { queryOptions } from '@tanstack/react-query'
import { getAttemptHistory } from '@/services/progress.service'

export const historyQuery = (programme: ProgrammeCode) =>
  queryOptions({
    queryKey: ['progress', 'history', programme],
    queryFn: () => getAttemptHistory(programme),
  })
