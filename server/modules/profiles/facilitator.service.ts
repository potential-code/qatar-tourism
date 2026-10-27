import { db } from '@server/db/connection'
import { profiles, trainerProfiles, user } from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import { recordAudit } from '@server/modules/audit/audit.service'
import type { FacilitatorTarget } from '@shared/schemas/profile-account'
import { eq, inArray } from 'drizzle-orm'
import { createDemoSession } from './demo-session'

/**
 * Demo facilitator quick switch (brief §3: "Demo facilitator access can offer role switching in
 * a clearly marked demo toolbar. Keep this separate from ordinary public registration.").
 *
 * Only the seeded demo administrator may start it. Switching creates a real Better Auth session
 * for one of a fixed list of SEEDED demo accounts (the five personas, the ten trainers, the
 * admin); it can never reach a newly registered account. The facilitator's identity travels in
 * a separate signed, HttpOnly cookie that is bound to the session it created, so signing out or
 * signing in as someone else ends facilitator access.
 */

const TARGET_EMAILS: Record<FacilitatorTarget, string> = {
  'persona-1': 'learner0001@example.com',
  'persona-2': 'learner0002@example.com',
  'persona-3': 'learner0003@example.com',
  'persona-4': 'learner0004@example.com',
  'persona-5': 'learner0005@example.com',
  'trainer-01': 'trainer01@example.com',
  'trainer-02': 'trainer02@example.com',
  'trainer-03': 'trainer03@example.com',
  'trainer-04': 'trainer04@example.com',
  'trainer-05': 'trainer05@example.com',
  'trainer-06': 'trainer06@example.com',
  'trainer-07': 'trainer07@example.com',
  'trainer-08': 'trainer08@example.com',
  'trainer-09': 'trainer09@example.com',
  'trainer-10': 'trainer10@example.com',
  admin: 'admin@example.com',
}

/** What each persona demonstrates (brief §15), shown in the toolbar. */
const PERSONA_PURPOSE: Partial<Record<FacilitatorTarget, string>> = {
  'persona-1': 'B learner, baseline 40, service recovery practice',
  'persona-2': 'A learner, Level 1 complete, ready to book',
  'persona-3': 'A and B, independent progress in each',
  'persona-4': 'A assignment returned for revision',
  'persona-5': 'B completed, pre 60 and post 100',
}

/** Signed cookie payload: `<admin user id>|<session token it switched into>`. */
export function packFacilitator(adminId: string, sessionToken: string) {
  return `${adminId}|${sessionToken}`
}

function unpackFacilitator(value: string | false | undefined) {
  if (!value) return null
  const [adminId, token] = value.split('|')
  return adminId && token ? { adminId, token } : null
}

type ViewerSession = { userId: string; role: string; token: string }

/**
 * The admin id behind this request, or null. The viewer is the admin themselves, or the
 * facilitator cookie is valid, bound to the current session, and its admin is still an admin.
 */
export async function facilitatorFor(
  viewer: ViewerSession,
  cookie: string | false | undefined,
): Promise<string | null> {
  if (viewer.role === 'admin') return viewer.userId
  const packed = unpackFacilitator(cookie)
  if (!packed || packed.token !== viewer.token) return null
  const [admin] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, packed.adminId))
    .limit(1)
  return admin?.role === 'admin' ? packed.adminId : null
}

export async function listTargets() {
  const emails = Object.values(TARGET_EMAILS)
  const accounts = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      learnerCode: profiles.learnerCode,
      trainerCode: trainerProfiles.code,
      headline: trainerProfiles.headline,
    })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .leftJoin(trainerProfiles, eq(trainerProfiles.userId, user.id))
    .where(inArray(user.email, emails))
  return (Object.entries(TARGET_EMAILS) as [FacilitatorTarget, string][]).flatMap(
    ([key, email]) => {
      const account = accounts.find((row) => row.email === email)
      if (!account) return []
      const code = account.learnerCode ?? account.trainerCode ?? null
      const description =
        PERSONA_PURPOSE[key] ?? account.headline ?? 'Academy administrator: Dashboard and reports'
      return [
        { key, name: account.name, role: account.role, code, description, image: account.image },
      ]
    },
  )
}

/** Creates a session for the target account. The route sets both cookies. */
export async function switchTo(adminId: string, target: FacilitatorTarget, previousToken: string) {
  const [account] = await db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(eq(user.email, TARGET_EMAILS[target]))
    .limit(1)
  if (!account) throw HttpError.notFound('That demo account is not in the current dataset')
  const [admin] = await db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(eq(user.id, adminId))
    .limit(1)
  if (admin?.role !== 'admin') throw HttpError.forbidden()

  // The facilitator's previous session is closed so only one stays active in this browser.
  const session = await createDemoSession(account.id, previousToken)

  await recordAudit(
    { id: admin.id, role: 'admin', name: admin.name },
    {
      action: 'demo.role_switch',
      objectType: 'user',
      objectId: account.id,
      after: { target, role: account.role },
      reason: 'Demo facilitator quick switch',
    },
  )
  return { session, role: account.role, name: account.name }
}
