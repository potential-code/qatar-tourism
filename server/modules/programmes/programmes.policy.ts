import { HttpError } from '@server/lib/errors'
import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'

/**
 * Programme access rules (brief §1, §3, §11).
 *
 * The catalogue, programme overviews, upcoming sample sessions and trainer profiles are public:
 * they hold fictional programme content only, never learner records or trainer contact data.
 */

/** Only a learner account can enrol itself. Trainers and admins never become learners here. */
export const SELF_ENROL_ROLES: readonly Role[] = ['learner']

/** Programmes a learner may join from the public site. C is an illustrative sample only. */
export const SELF_ENROL_PROGRAMMES: readonly ProgrammeCode[] = ['A', 'B']

export function assertCanSelfEnrol(role: Role, code: ProgrammeCode): void {
  if (!SELF_ENROL_ROLES.includes(role)) {
    throw HttpError.forbidden('Only learner accounts can enrol on a programme')
  }
  if (!SELF_ENROL_PROGRAMMES.includes(code)) {
    throw new HttpError(
      409,
      'PROGRAMME_ILLUSTRATIVE',
      'Program C is an illustrative sample programme and does not take enrolments.',
    )
  }
}
