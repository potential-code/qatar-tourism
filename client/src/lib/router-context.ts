import type { QueryClient } from '@tanstack/react-query'
import type { Session } from '@/lib/auth-client'

/** Available to every route's `beforeLoad` and `loader` as `context`. */
export type RouterContext = {
  queryClient: QueryClient
  auth: {
    /** Cached session (React Query); resolves to null when signed out. */
    getSession: () => Promise<Session | null>
  }
}
