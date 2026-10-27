import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { authClient, roleOf } from '@/lib/auth-client'

/**
 * The session lives in React Query so route guards (`beforeLoad`) and components read the
 * same cached value. Anything that changes the session must call `refresh` or `clear`.
 */
export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: async () => {
    const { data, error } = await authClient.getSession()
    if (error) throw new Error(error.message ?? 'Could not load session')
    return data
  },
  staleTime: 60_000,
})

export function useSession() {
  const query = useQuery(sessionQueryOptions)
  return { ...query, session: query.data ?? null, role: roleOf(query.data) }
}

export function useRefreshSession() {
  const queryClient = useQueryClient()
  // fetchQuery, not invalidateQueries: on the login page nothing observes the session, so an
  // invalidation would leave the stale `null` for the next route guard to read.
  return useCallback(
    () => queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: 0 }),
    [queryClient],
  )
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await authClient.signOut()
    // Drop every cached query: the next user must not see the previous user's data.
    queryClient.clear()
  }, [queryClient])
}
