import type { ProgrammeStatus } from '@shared/constants'

export const STATUS_LABEL: Record<ProgrammeStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

/** "foundationQuiz" → "Foundation quiz"; values rendered as the rule reads. */
export function ruleLabel(key: string) {
  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function ruleValue(key: string, value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number' && !/required|count/i.test(key)) return `${value}%`
  if (typeof value === 'number') return String(value)
  return String(value)
}
