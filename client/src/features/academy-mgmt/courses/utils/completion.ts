/** Plain-language completion mapping for a course's machine-readable rule (brief §7, §14). */
export function describeRule(rule: Record<string, unknown>): string {
  const n = (key: string) => Number(rule[key])
  switch (rule.type) {
    case 'video_watched':
      return `Video watched to at least ${n('percent')}%, with captions available`
    case 'package_reports_completion':
      return 'The interactive package reports completion'
    case 'formative_questions':
      return `${n('questions')} formative questions answered`
    case 'module_quiz':
      return `Module quiz passed at ${n('minPercent')}% or more`
    case 'resource_and_exercise':
      return `Resource opened and an exercise of ${n('wordsMin')} to ${n('wordsMax')} words submitted`
    case 'session_attended_and_scored':
      return `Session attended and scored ${n('minScore')} or more by the trainer`
    case 'preview_viewed':
      return 'Preview viewed'
    default:
      return 'Custom rule'
  }
}

export const FORMAT_LABEL: Record<string, string> = {
  video: 'Video',
  interactive: 'Interactive',
  resource: 'Resource',
  session: 'Trainer-led session',
  preview: 'Preview',
}

export const PACKAGE_LABEL: Record<string, string> = {
  video: 'Video',
  scorm_2004: 'SCORM 2004',
  scorm_12: 'SCORM 1.2',
  html_preview: 'HTML preview',
  resource: 'Resource',
}
