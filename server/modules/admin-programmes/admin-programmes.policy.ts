import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'

/** Programme management is admin only (shared/permissions.ts 'path.change'). */
export const PROGRAMME_ADMIN_ROLES: readonly Role[] = ['admin']

/**
 * Only Program A certifies (brief §3, §14: "Enforce Program B certification off"). Program C is
 * an illustrative sample and never certifies either. Enforced in the service, not the UI.
 */
export const canCertify = (code: ProgrammeCode) => code === 'A'

/** Enrolment mode is a fixed demo rule per programme (brief §1, §3), shown read-only. */
export const ENROLMENT_MODE: Record<ProgrammeCode, { label: string; detail: string }> = {
  A: {
    label: 'Explicit choice with demo approval',
    detail:
      'Learners choose Program A explicitly; a demo approval rule confirms the enrolment. Existing accounts keep their other enrolments.',
  },
  B: {
    label: 'Open visitor registration (default)',
    detail: 'Public visitor registration enrols in Program B by default.',
  },
  C: {
    label: 'Illustrative sample',
    detail: 'Seeded historical demo activity only. Not an actual Qatar Tourism programme.',
  },
}
