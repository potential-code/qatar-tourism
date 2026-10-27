import { timingSafeEqual } from 'node:crypto'
import { auth } from '@server/auth/auth'
import { db } from '@server/db/connection'
import { profiles, user, verification } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { recordAudit } from '@server/modules/audit/audit.service'
import { notify } from '@server/modules/notifications/notifications.service'
import { enrol } from '@server/modules/programmes/enrolment.service'
import { SIMULATED_EMAIL_LABEL } from '@shared/content'
import type { RegisterInput } from '@shared/schemas'
import { and, eq, gt, sql } from 'drizzle-orm'

/**
 * Public registration (brief §3–4).
 *
 * Better Auth creates the account (role is `input: false`, so a sign-up can never choose one:
 * every new account is a learner). Better Auth requires a verified email before sign-in; in
 * the demo that step is an explicitly SIMULATED verification: a six-digit code is "sent" to a
 * demo inbox shown on screen and logged as a simulated email. No external email claims are made.
 */

const VERIFY_PREFIX = 'qta-demo-verify:'
const CODE_TTL_MINUTES = 30

export const DUPLICATE_ACCOUNT_MESSAGE =
  'An account with this email already exists. Sign in instead, or reset your password if you have forgotten it.'
export const UNVERIFIED_ACCOUNT_MESSAGE =
  'This email is registered but not verified yet. Request a new demo code to finish verification.'
const INVALID_CODE_MESSAGE = 'That code is not valid or has expired. Request a new code.'

export type SimulatedEmail = {
  label: string
  to: string
  subject: string
  body: string
  code: string
}

function sixDigitCode(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  return String(value % 1_000_000).padStart(6, '0')
}

function sameCode(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

async function findUserByEmail(email: string) {
  const [row] = await db
    .select({ id: user.id, name: user.name, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)
  return row ?? null
}

/** Next free learner code (L1201, L1202, …) after the seeded L0001–L1200. */
async function nextLearnerCode(
  executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
  const [row] = await executor
    .select({
      max: sql<number>`coalesce(max(substring(${profiles.learnerCode} from 2)::int), 0)::int`,
    })
    .from(profiles)
  return `L${String((row?.max ?? 0) + 1).padStart(4, '0')}`
}

/** Issues a fresh demo code (older codes for the address stop working) and logs the simulated email. */
async function issueSimulatedCode(
  userId: string,
  email: string,
  name: string,
): Promise<SimulatedEmail> {
  const code = sixDigitCode()
  const identifier = `${VERIFY_PREFIX}${email}`
  const issuedAt = now()
  await db.transaction(async (tx) => {
    await tx.delete(verification).where(eq(verification.identifier, identifier))
    await tx.insert(verification).values({
      id: crypto.randomUUID(),
      identifier,
      value: code,
      expiresAt: new Date(issuedAt.getTime() + CODE_TTL_MINUTES * 60_000),
    })
  })
  const firstName = name.split(' ')[0] ?? name
  const subject = 'Verify your Qatar Tourism Academy email'
  const body = `Hello ${firstName}, your demo verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. This is a simulated email: no external email was sent.`
  await notify({
    eventId: `account-verify:${userId}:${issuedAt.getTime()}`,
    kind: 'account_verification',
    recipientIds: [userId],
    subject,
    body,
  })
  return { label: SIMULATED_EMAIL_LABEL, to: email, subject, body, code }
}

export async function register(input: RegisterInput) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()

  const existing = await findUserByEmail(email)
  if (existing) {
    throw existing.emailVerified
      ? new HttpError(409, 'ACCOUNT_EXISTS', DUPLICATE_ACCOUNT_MESSAGE)
      : new HttpError(409, 'ACCOUNT_UNVERIFIED', UNVERIFIED_ACCOUNT_MESSAGE)
  }

  try {
    await auth.api.signUpEmail({ body: { name, email, password: input.password } })
  } catch (error) {
    // A parallel sign-up with the same address lost the race.
    if (await findUserByEmail(email)) {
      throw new HttpError(409, 'ACCOUNT_EXISTS', DUPLICATE_ACCOUNT_MESSAGE)
    }
    throw error
  }
  const created = await findUserByEmail(email)
  if (!created) throw new Error('Registration did not create an account')

  const actor = { id: created.id, role: 'learner' as const, name }
  const learnerCode = await db.transaction(async (tx) => {
    const code = await nextLearnerCode(tx)
    const registeredAt = now()
    await tx.insert(profiles).values({
      userId: created.id,
      learnerCode: code,
      fullName: name,
      status: 'draft',
      wizardStep: 1,
      completeness: 0,
      registeredAt,
      lastActivityAt: registeredAt,
    })
    await recordAudit(
      actor,
      {
        action: 'account.register',
        objectType: 'user',
        objectId: created.id,
        after: { learnerCode: code, role: 'learner', programme: input.programme },
      },
      tx,
    )
    // Visitor registration defaults to Program B (brief §1, §3). A visitor who came from the
    // Program A call to action confirms A explicitly later and is not placed on B.
    if (input.programme !== 'A') await enrol(actor, created.id, 'B', tx)
    return code
  })

  const simulatedEmail = await issueSimulatedCode(created.id, email, name)
  return { email, learnerCode, programme: input.programme, simulatedEmail }
}

/** Completes the simulated verification step; the client then signs in with the password. */
export async function verifySimulated(emailInput: string, code: string) {
  const email = emailInput.trim().toLowerCase()
  const account = await findUserByEmail(email)
  if (!account) throw new HttpError(400, 'INVALID_CODE', INVALID_CODE_MESSAGE)
  if (account.emailVerified) return { email, verified: true as const }

  const identifier = `${VERIFY_PREFIX}${email}`
  const [row] = await db
    .select()
    .from(verification)
    .where(and(eq(verification.identifier, identifier), gt(verification.expiresAt, now())))
    .limit(1)
  if (!row || !sameCode(row.value, code)) {
    throw new HttpError(400, 'INVALID_CODE', INVALID_CODE_MESSAGE)
  }

  await db.transaction(async (tx) => {
    await tx.update(user).set({ emailVerified: true }).where(eq(user.id, account.id))
    await tx.delete(verification).where(eq(verification.identifier, identifier))
    await recordAudit(
      { id: account.id, role: 'learner', name: account.name },
      {
        action: 'account.verify_simulated',
        objectType: 'user',
        objectId: account.id,
        after: { emailVerified: true, method: 'simulated demo code' },
      },
      tx,
    )
  })
  return { email, verified: true as const }
}

/**
 * New demo code for an unverified account. A verified or unknown address gets the same neutral
 * answer without a code, so this cannot be used to verify someone else's account.
 */
export async function resendSimulated(emailInput: string) {
  const email = emailInput.trim().toLowerCase()
  const account = await findUserByEmail(email)
  if (!account || account.emailVerified) return { email, simulatedEmail: null }
  return { email, simulatedEmail: await issueSimulatedCode(account.id, email, account.name) }
}
