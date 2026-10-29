import { MutationCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-error'

/**
 * One client for the app. Every successful mutation also invalidates the whole cache (as
 * wep-mockup does): the mock services are fast, and the learner, trainer and admin views of
 * the same data stay in sync without per-feature invalidation lists. Feature-level
 * `onSuccess` invalidations still run first.
 */
export function createQueryClient() {
  const client: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: () => {
        void client.invalidateQueries()
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A 4xx will not fix itself on retry; only retry what might be transient.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false
          return failureCount < 2
        },
      },
    },
  })
  return client
}

export const queryClient = createQueryClient()
