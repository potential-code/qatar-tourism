import { useTranslation } from 'react-i18next'
import type { MenuItem } from '../../utils/courseMenu'
import { KIND_KEY } from '../../utils/itemLink'

/** "Pre-assessment", "C01 · Unit", "AI practice": the type label shown above a menu title. */
export function useItemTypeLabel(item: Pick<MenuItem, 'kind' | 'courseCode'>): string {
  const { t } = useTranslation('learner')
  if (item.kind === 'assessment_pre') return t('learning.course.preAssessment')
  if (item.kind === 'assessment_post') return t('learning.course.postAssessment')
  const kind = t(KIND_KEY[item.kind as keyof typeof KIND_KEY] ?? 'learning.kind.fallback')
  return item.courseCode ? `${item.courseCode} · ${kind}` : kind
}
