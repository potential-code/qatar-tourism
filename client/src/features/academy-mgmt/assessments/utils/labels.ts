import { COMPETENCY_LABELS } from '@shared/content/assessments'

export { COMPETENCY_LABELS }

export const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const
export const LANGUAGE_LABELS = { en: 'English', ar: 'Arabic' } as const
export const TYPE_LABELS = {
  single: 'Single choice',
  multiple: 'Multiple choice',
  scenario: 'Scenario',
} as const
export const STATUS_LABELS = { draft: 'Draft', published: 'Published' } as const
export const KIND_LABELS = { pre: 'Pre-assessment', post: 'Post-assessment' } as const
export const FEEDBACK_LABELS = {
  immediate: 'Immediately after each answer is saved',
  after_submission: 'After the attempt is submitted',
  after_pass: 'Only after the learner passes',
} as const
export const POLICY_LABELS = { best: 'Best score counts', latest: 'Latest score counts' } as const

export const toOptions = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }))

/** What gates each assessment today. These come from the programme and path rules, not this page. */
export const PREREQUISITES: Record<string, string> = {
  'A:pre': 'None. The baseline is the first step after enrolment.',
  'B:pre': 'None. The baseline is the first step after enrolment.',
  'A:post':
    'Baseline done, the Level 1 foundation units and quiz (80%), an attended and scored session, and an approved assignment.',
  'B:post': 'Baseline done, the core lessons and one AI practice conversation.',
}

export const instant = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Qatar',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(iso))
    : 'Not yet'
