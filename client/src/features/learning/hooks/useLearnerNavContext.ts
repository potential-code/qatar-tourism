import { useQuery } from '@tanstack/react-query'
import type { NavContext } from '@/app/navigation'
import { enrolmentsQuery } from '../queries/learning.queries'

/** The learner's programmes, for conditional portal navigation. Unknown until loaded. */
export function useLearnerNavContext(): NavContext {
  const { data } = useQuery(enrolmentsQuery())
  return { programmes: data ? data.items.map((e) => e.programme) : null }
}
