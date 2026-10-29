import { SIMULATED_EMAIL_LABEL } from '@shared/content'
import { registerInput } from '@shared/schemas'
import { resendSimulatedInput, verifySimulatedInput } from '@shared/schemas/profile-account'
import type { UserRow } from '@shared/types/db'
import type { z } from 'zod'
import {
  ApiError,
  commit,
  db,
  delay,
  insertRow,
  newId,
  now,
  nowIso,
  out,
  parseInput,
  updateRow,
} from './api'
import { recordAudit } from './audit.service'
import { enrol } from './enrolment/core'
import { notify } from './notifications.service'
import { nextLearnerCode } from './profiles/learner-code'

/**
 * Public registration (brief §3–4), formerly server/modules/profiles/registration.service.ts.
 *
 * Every new account is a learner: the input has no role. A verified email is required before
 * sign-in; in the demo that step is an explicitly SIMULATED verification: a six-digit code is
 * "sent" to a demo inbox shown on screen and logged as a simulated email. No email leaves the
 * browser. The chosen password is kept in `db.passwords` for sign-in.
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

const findUserByEmail = (email: string): UserRow | undefined =>
  db.users.find((u) => u.email.toLowerCase() === email)

/** Issues a fresh demo code (older codes for the address stop working) and logs the simulated email. */
function issueSimulatedCode(userId: string, email: string, name: string): SimulatedEmail {
  const code = sixDigitCode()
  const identifier = `${VERIFY_PREFIX}${email}`
  const issuedAt = now()
  db.verifications = db.verifications.filter((v) => v.identifier !== identifier)
  insertRow('verifications', {
    identifier,
    value: code,
    expiresAt: new Date(issuedAt.getTime() + CODE_TTL_MINUTES * 60_000).toISOString(),
  })
  const firstName = name.split(' ')[0] ?? name
  const subject = 'Verify your Qatar Tourism Academy email'
  const body = `Hello ${firstName}, your demo verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. This is a simulated email: no external email was sent.`
  notify({
    eventId: `account-verify:${userId}:${issuedAt.getTime()}`,
    kind: 'account_verification',
    recipientIds: [userId],
    subject,
    body,
  })
  return { label: SIMULATED_EMAIL_LABEL, to: email, subject, body, code }
}

/**
 * Creates a learner account with a draft profile and the next learner code, enrols it on
 * Program B (unless the visitor came from the Program A call to action) and issues the demo
 * verification code. 409 ACCOUNT_EXISTS / ACCOUNT_UNVERIFIED for a known address; 400 for an
 * address outside example.com.
 */
export async function register(input: z.input<typeof registerInput>) {
  await delay(300)
  const parsed = parseInput(registerInput, input)
  const email = parsed.email.trim().toLowerCase()
  const name = parsed.name.trim()

  const existing = findUserByEmail(email)
  if (existing) {
    throw existing.emailVerified
      ? new ApiError(409, 'ACCOUNT_EXISTS', DUPLICATE_ACCOUNT_MESSAGE)
      : new ApiError(409, 'ACCOUNT_UNVERIFIED', UNVERIFIED_ACCOUNT_MESSAGE)
  }

  const account = insertRow('users', {
    id: newId('user'),
    name,
    email,
    emailVerified: false,
    image: null,
    role: 'learner',
  })
  db.passwords[account.id] = parsed.password

  const actor = { id: account.id, role: 'learner' as const, name }
  const learnerCode = nextLearnerCode()
  const registeredAt = nowIso()
  insertRow('profiles', {
    userId: account.id,
    learnerCode,
    fullName: name,
    status: 'draft',
    wizardStep: 1,
    completeness: 0,
    registeredAt,
    lastActivityAt: registeredAt,
  })
  recordAudit(actor, {
    action: 'account.register',
    objectType: 'user',
    objectId: account.id,
    after: { learnerCode, role: 'learner', programme: parsed.programme },
  })
  // Visitor registration defaults to Program B (brief §1, §3). A visitor who came from the
  // Program A call to action confirms A explicitly later and is not placed on B.
  if (parsed.programme !== 'A') enrol(actor, account.id, 'B')

  const simulatedEmail = issueSimulatedCode(account.id, email, name)
  commit()
  return out({ email, learnerCode, programme: parsed.programme, simulatedEmail })
}

/** Completes the simulated verification step; the client then signs in with the password. */
export async function verifySimulated(input: { email: string; code: string }) {
  await delay()
  const parsed = parseInput(verifySimulatedInput, input)
  const email = parsed.email.trim().toLowerCase()
  const account = findUserByEmail(email)
  if (!account) throw new ApiError(400, 'INVALID_CODE', INVALID_CODE_MESSAGE)
  if (account.emailVerified) return { email, verified: true as const }

  const identifier = `${VERIFY_PREFIX}${email}`
  const instant = nowIso()
  const row = db.verifications.find((v) => v.identifier === identifier && v.expiresAt > instant)
  if (!row || row.value !== parsed.code) {
    throw new ApiError(400, 'INVALID_CODE', INVALID_CODE_MESSAGE)
  }

  updateRow(account, { emailVerified: true })
  db.verifications = db.verifications.filter((v) => v.identifier !== identifier)
  recordAudit(
    { id: account.id, role: 'learner', name: account.name },
    {
      action: 'account.verify_simulated',
      objectType: 'user',
      objectId: account.id,
      after: { emailVerified: true, method: 'simulated demo code' },
    },
  )
  commit()
  return { email, verified: true as const }
}

/**
 * New demo code for an unverified account. A verified or unknown address gets the same neutral
 * answer without a code, so this cannot be used to verify someone else's account.
 */
export async function resendSimulated(emailInput: string) {
  await delay()
  const { email: parsed } = parseInput(resendSimulatedInput, { email: emailInput })
  const email = parsed.trim().toLowerCase()
  const account = findUserByEmail(email)
  if (!account || account.emailVerified) return { email, simulatedEmail: null }
  const simulatedEmail = issueSimulatedCode(account.id, email, account.name)
  commit()
  return out({ email, simulatedEmail: simulatedEmail as SimulatedEmail | null })
}
