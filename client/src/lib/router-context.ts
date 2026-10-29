import type { QueryClient } from '@tanstack/react-query'
import type { Session } from '@/lib/session'

/** Available to every route's `beforeLoad` and `loader` as `context`. */
export type RouterContext = {
  queryClient: QueryClient
  auth: {
    /** Cached session (React Query); resolves to null when signed out. */
    getSession: () => Promise<Session | null>
  }
}
