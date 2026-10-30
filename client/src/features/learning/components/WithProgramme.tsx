import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useActiveProgramme } from '../hooks/useActiveProgramme'
import type { EnrolmentSummary, Enrolments } from '../types'
import { LoadError } from './LoadError'

export type ProgrammeContext = {
  programme: ProgrammeCode
  enrolment: EnrolmentSummary
  enrolments: readonly EnrolmentSummary[]
  learner: Enrolments['learner']
  setProgramme: (programme: ProgrammeCode) => void
}

/**
 * Resolves the active programme for a learner page and handles the shared states: loading,
 * error and "not enrolled yet". Children render only with a real enrolment.
 */
export function WithProgramme({
  children,
  skeleton,
}: {
  children: (context: ProgrammeContext) => ReactNode
  skeleton: ReactNode
}) {
  const { t } = useTranslation('learner')
  const active = useActiveProgramme()
  if (active.isLoading) return <>{skeleton}</>
  if (active.error) return <LoadError error={active.error} onRetry={() => void active.refetch()} />
  const enrolment = active.enrolments.find((e) => e.programme === active.programme)
  if (!active.programme || !enrolment || !active.learner) {
    return (
      <div className="rounded-xl border bg-white">
        <EmptyState
          icon={GraduationCap}
          size="lg"
          title={t('learning.notEnrolled.title')}
          description={t('learning.notEnrolled.description')}
          action={
            <Button asChild>
              <Link to="/">{t('learning.notEnrolled.action')}</Link>
            </Button>
          }
        />
      </div>
    )
  }
  return (
    <>
      {children({
        programme: active.programme,
        enrolment,
        enrolments: active.enrolments,
        learner: active.learner,
        setProgramme: active.setProgramme,
      })}
    </>
  )
}
