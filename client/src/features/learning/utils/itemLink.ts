import type { ProgrammeCode } from '@shared/constants'

type LinkableItem = {
  kind: string
  courseCode: string | null
  scenarioKey?: string | null
}

/**
 * Where a path item lives. Units, assessments and the path are this feature's pages; practice,
 * sessions and assignments belong to other portal pages and are linked, not rebuilt.
 */
export function itemLink(
  item: LinkableItem,
  programme: ProgrammeCode,
): { to: string; search: Record<string, string> } {
  const search = { programme }
  switch (item.kind) {
    case 'assessment_pre':
      return { to: '/learner/assessments/pre', search }
    case 'assessment_post':
      return { to: '/learner/assessments/post', search }
    case 'assessment_formative':
      return { to: '/learner/assessments/formative', search }
    case 'ai_practice':
      return {
        to: '/learner/practice',
        search: item.scenarioKey ? { ...search, scenario: item.scenarioKey } : search,
      }
    case 'session':
      return { to: '/learner/sessions', search }
    case 'assignment':
      return { to: '/learner/assignments', search }
    default:
      return item.courseCode
        ? { to: `/learner/learning/${item.courseCode}`, search }
        : { to: '/learner/learning', search }
  }
}

export const KIND_LABEL: Record<string, string> = {
  course: 'Unit',
  assessment_pre: 'Assessment',
  assessment_post: 'Assessment',
  assessment_formative: 'Quiz',
  ai_practice: 'AI practice',
  session: 'Trainer-led session',
  assignment: 'Assignment',
}
