import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'
import { programmeCodeParam } from '@shared/schemas/profile-account'
import { ApiError, commit, delay, out, parseInput, requireUser } from './api'
import { enrol, listOwnEnrolments } from './enrolment/core'

/**
 * Joining a programme from the public pages (brief §3 routing), formerly the enrolment routes
 * of server/modules/programmes (programmes.controller + programmes.policy).
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

/** The signed-in learner's enrolments; empty for staff. */
export async function listMyEnrolments() {
  await delay()
  const user = requireUser()
  return out(user.role === 'learner' ? listOwnEnrolments(user.id) : [])
}

export type OwnEnrolment = Awaited<ReturnType<typeof listMyEnrolments>>[number]

/** Join Program A (or B). Idempotent: a second click returns the existing enrolment. */
export async function enrolSelf(code: ProgrammeCode) {
  await delay()
  const user = requireUser()
  const parsed = parseInput(programmeCodeParam, { code }, 'param').code
  assertCanSelfEnrol(user.role, parsed)
  const result = enrol({ id: user.id, role: user.role, name: user.name }, user.id, parsed)
  commit()
  return { programme: parsed, ...result }
}
