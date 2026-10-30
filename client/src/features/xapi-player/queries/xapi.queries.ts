import type { ProgrammeCode } from '@shared/constants'
import { queryOptions, useMutation } from '@tanstack/react-query'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import * as xapi from '@/services/xapi.service'

export const xapiLaunchQuery = (programme: ProgrammeCode, code: string, packageId?: string) =>
  queryOptions({
    queryKey: ['learning', 'xapi', programme, code, packageId ?? null],
    queryFn: () => xapi.getLaunch(programme, code, packageId),
    // Always launch from the latest saved state document.
    staleTime: 0,
  })

export function useXapiRestart(code: string, packageId?: string) {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (programme: ProgrammeCode) => xapi.restart(programme, code, packageId),
    onSuccess: () => void invalidate(),
  })
}

export const adminStatementsQuery = (packageId: string) =>
  queryOptions({
    queryKey: ['content-library', 'statements', packageId],
    queryFn: () => xapi.listStatements(packageId),
  })
