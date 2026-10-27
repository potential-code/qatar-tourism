import { createFileRoute } from '@tanstack/react-router'
import {
  programmesQuery,
  upcomingSessionsQuery,
} from '@/features/programmes/queries/programmes.queries'
import { HomePage } from '@/features/public-site/components/HomePage'

/** Public homepage (brief §2). */
export const Route = createFileRoute('/')({
  loader: ({ context }) => {
    // Warm the catalogue while the hero animates; the sections render their own states.
    void context.queryClient.prefetchQuery(programmesQuery())
    void context.queryClient.prefetchQuery(upcomingSessionsQuery())
  },
  component: HomePage,
})
