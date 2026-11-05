import type { ProgrammeCode } from '@shared/constants'
import type { PracticeEnrolment } from '../types'

/**
 * Whether practice copy may mention certification. Program B has no certificate (brief §5), so
 * its practice notes say nothing about certification; Program A keeps the clause.
 */
export function mentionsCertification(programme: string | null | undefined): boolean {
  return programme !== 'B'
}

/** "Record this practice in" starts on the active programme, else the first enrolment. */
export function defaultEnrolmentId(
  enrolments: readonly PracticeEnrolment[],
  programme: ProgrammeCode | null | undefined,
): string {
  const active = programme ? enrolments.find((e) => e.programmeCode === programme) : undefined
  return (active ?? enrolments[0])?.id ?? ''
}
