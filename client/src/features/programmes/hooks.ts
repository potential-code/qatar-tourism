import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/hooks/useSession'
import { programmeSlug } from './content'
import { myEnrolmentsQuery } from './queries/programmes.queries'
import { programmeName } from './utils/copy'

export type ProgrammeCta = {
  label: string
  to: string
  params?: Record<string, string>
  hash?: string
}

/**
 * The programme's primary action (brief §3): A "Join Program A", B "Start with Program B",
 * C "Explore sample programme". An enrolled learner continues instead of joining again.
 */
export function useProgrammeCta(code: ProgrammeCode, ctaLabel: string): ProgrammeCta {
  const { role } = useSession()
  const { t } = useTranslation('public')
  const enrolments = useQuery({ ...myEnrolmentsQuery(), enabled: role === 'learner' })
  if (code === 'C')
    return {
      label: ctaLabel,
      to: '/programmes/$code',
      params: { code: 'c' },
      hash: 'sample-preview',
    }
  const enrolled = enrolments.data?.some((e) => e.programme === code)
  if (role === 'learner' && enrolled) {
    return {
      label: t('programme.continue', { programme: programmeName(t, code) }),
      to: '/learner/learning',
    }
  }
  if (!role && code === 'B') return { label: ctaLabel, to: '/register' }
  return { label: ctaLabel, to: '/programmes/$code/enrol', params: { code: programmeSlug(code) } }
}
