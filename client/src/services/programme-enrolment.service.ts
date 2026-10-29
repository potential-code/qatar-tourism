import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'
import { programmeCodeParam } from '@shared/schemas/profile-account'
import { ApiError, commit, delay, out, parseInput, requireUser } from './api'
import { enrol as enrolCore, listOwnEnrolments } from './enrolment/core'

/**
 * Joining a programme from the public site and reading one's own enrolments there (brief §3
 * routing rules), formerly the learner half of server/modules/programmes.
 */

/** Only a learner account can enrol itself. Trainers and admins never become learners here. */
const SELF_ENROL_ROLES: readonly Role[] = ['learner']

/** Programmes a learner may join from the public site. C is an illustrative sample only. */
const SELF_ENROL_PROGRAMMES: readonly ProgrammeCode[] = ['A', 'B']

function assertCanSelfEnrol(role: Role, code: ProgrammeCode): void {
  if (!SELF_ENROL_ROLES.includes(role)) {
    throw ApiError.forbidden('Only learner accounts can enrol on a programme')
  }
  if (!SELF_ENROL_PROGRAMMES.includes(code)) {
    throw new ApiError(
      409,
      'PROGRAMME_ILLUSTRATIVE',
      'Program C is an illustrative sample programme and does not take enrolments.',
    )
  }
}

/** The signed-in user's programme enrolments for the public pages; empty for staff. */
export async function listMyEnrolments() {
  await delay()
  const user = requireUser()
  if (user.role !== 'learner') return out({ items: [] as ReturnType<typeof listOwnEnrolments> })
  return out({ items: listOwnEnrolments(user.id) })
}

/** Join Program A (or B) from the public site (brief §3 routing rules). Idempotent. */
export async function enrolSelf(code: string) {
  await delay()
  const user = requireUser()
  const { code: programme } = parseInput(programmeCodeParam, { code }, 'param')
  assertCanSelfEnrol(user.role, programme)
  const result = enrolCore(user, user.id, programme)
  commit()
  return out({ programme, ...result })
}
