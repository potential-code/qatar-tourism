import type { NavContext } from '@/app/navigation'
import { useActiveProgramme } from './useActiveProgramme'

/**
 * The learner's programmes and the one being viewed, for conditional portal navigation.
 * Unknown until loaded.
 */
export function useLearnerNavContext(): NavContext {
  const { enrolments, programme, isLoading } = useActiveProgramme()
  return {
    programmes: isLoading ? null : enrolments.map((e) => e.programme),
    activeProgramme: programme,
  }
}
