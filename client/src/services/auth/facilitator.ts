import { type FacilitatorTarget, facilitatorSwitchInput } from '@shared/schemas/profile-account'
import { ApiError, db, delay, out, parseInput, requireUser } from '../api'
import { recordAudit } from '../audit.service'
import { startSession } from './session'

/**
 * Demo facilitator quick switch (brief §3: "Demo facilitator access can offer role switching in
 * a clearly marked demo toolbar. Keep this separate from ordinary public registration."),
 * formerly server/modules/profiles/facilitator.service.ts.
 *
 * Only the seeded demo administrator may use it. Switching signs in as one of a fixed list of
 * SEEDED demo accounts; it can never reach a newly registered account. The facilitator's
 * identity is kept on the session (`facilitatorId`), so signing out ends facilitator access.
 */

/** Seeded user id per target: ids are stable, sign-in addresses are derived from names. */
const TARGET_USER_IDS: Record<FacilitatorTarget, string> = {
  'persona-1': 'user-l0001',
  'persona-2': 'user-l0002',
  'persona-3': 'user-l0003',
  'persona-4': 'user-l0004',
  'persona-5': 'user-l0005',
  'trainer-01': 'user-t01',
  'trainer-02': 'user-t02',
  'trainer-03': 'user-t03',
  'trainer-04': 'user-t04',
  'trainer-05': 'user-t05',
  'trainer-06': 'user-t06',
  'trainer-07': 'user-t07',
  'trainer-08': 'user-t08',
  'trainer-09': 'user-t09',
  'trainer-10': 'user-t10',
  admin: 'user-admin',
}

/** What each persona demonstrates (brief §15), shown in the toolbar. */
const PERSONA_PURPOSE: Partial<Record<FacilitatorTarget, string>> = {
  'persona-1': 'B learner, baseline 40, service recovery practice',
  'persona-2': 'A learner, Level 1 complete, ready to book',
  'persona-3': 'A and B, independent progress in each',
  'persona-4': 'A assignment returned for revision',
  'persona-5': 'B completed, pre 60 and post 100',
}

const isAdmin = (userId: string | null | undefined) =>
  Boolean(userId) && db.users.find((u) => u.id === userId)?.role === 'admin'

/** The admin id behind the current session: the admin themselves, or the facilitator. */
function facilitatorId(): string | null {
  const user = requireUser()
  if (user.role === 'admin') return user.id
  const behind = db.session?.facilitatorId
  return behind && isAdmin(behind) ? behind : null
}

function listTargets() {
  return (Object.entries(TARGET_USER_IDS) as [FacilitatorTarget, string][]).flatMap(
    ([key, userId]) => {
      const account = db.users.find((u) => u.id === userId)
      if (!account) return []
      const learnerCode = db.profiles.find((p) => p.userId === account.id)?.learnerCode
      const trainer = db.trainerProfiles.find((t) => t.userId === account.id)
      const description =
        PERSONA_PURPOSE[key] ?? trainer?.headline ?? 'Academy administrator: Dashboard and reports'
      return [
        {
          key,
          name: account.name,
          role: account.role,
          code: learnerCode ?? trainer?.code ?? null,
          description,
          image: account.image,
        },
      ]
    },
  )
}

/** Whether the toolbar shows for this session, and the accounts it can open. */
export async function getFacilitatorStatus() {
  await delay(120)
  return facilitatorId()
    ? out({ active: true as const, targets: listTargets() })
    : { active: false as const, targets: [] }
}

/** Signs in as a seeded demo account, keeping the facilitator behind it. Audited. */
export async function switchFacilitator(input: FacilitatorTarget) {
  await delay()
  const { target } = parseInput(facilitatorSwitchInput, { target: input })
  const adminId = facilitatorId()
  if (!adminId) {
    throw ApiError.forbidden('The demo toolbar is available to the demo administrator only')
  }
  const account = db.users.find((u) => u.id === TARGET_USER_IDS[target])
  if (!account) throw ApiError.notFound('That demo account is not in the current dataset')
  const admin = db.users.find((u) => u.id === adminId)
  if (admin?.role !== 'admin') throw ApiError.forbidden()

  startSession(account, admin.id)
  recordAudit(
    { id: admin.id, role: 'admin', name: admin.name },
    {
      action: 'demo.role_switch',
      objectType: 'user',
      objectId: account.id,
      after: { target, role: account.role },
      reason: 'Demo facilitator quick switch',
    },
  )
  return { role: account.role, name: account.name }
}
