import type { Competency } from '@shared/constants'

export const COMPETENCY_LABEL: Record<Competency, string> = {
  discover_needs: 'Discover needs',
  verify_information: 'Verify information',
  communicate_clearly: 'Communicate clearly',
  recover_service: 'Recover service',
  protect_information: 'Protect information',
}

/** Photograph per scenario, from the official asset set. Decorative only. */
export const SCENARIO_IMAGE: Record<string, string> = {
  'changed-booking': '/images/official/tour-operator.jpg',
  'unclear-directions': '/images/official/katara-towers.jpg',
  'accessibility-preference': '/images/official/museum-family.jpg',
  'group-running-late': '/images/official/dhow-boat-min.jpg',
}

export const MODE_LABEL = { text: 'Text', voice: 'Voice' } as const

/** Score band words, so a score never relies on colour alone. */
export function scoreBand(percent: number): { label: string; tone: 'strong' | 'steady' | 'build' } {
  if (percent >= 80) return { label: 'Strong', tone: 'strong' }
  if (percent >= 60) return { label: 'Developing', tone: 'steady' }
  return { label: 'Building', tone: 'build' }
}
