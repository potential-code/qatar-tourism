import { SIMULATED_EMAIL_LABEL } from '@shared/content'
import { z } from 'zod'
import { ApiError, commit, db, delay, insertRow, newId, now, nowIso, out, parseInput } from './api'
import { recordAudit } from './audit.service'
import { notify } from './notifications.service'

/**
 * SIMULATED password reset (formerly Better Auth's reset flow). No email is sent: the reset
 * link appears in a demo inbox labelled "Demo email" and in the notification log as a
 * simulated email. A new password is kept in `db.passwords`; a demo reset restores the seed.
 */

const RESET_PREFIX = 'qta-demo-reset:'
const LINK_TTL_MINUTES = 60

const requestInput = z.object({ email: z.email('Enter a valid email address') })
const resetInput = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'Use at least 8 characters').max(128),
})

export type ResetEmail = { label: string; to: string; subject: string; body: string; link: string }

/**
 * Creates a reset link for the address. The visible answer is the same whether or not the
 * account exists; the demo inbox shows the link only for an existing account.
 */
export async function requestPasswordReset(emailInput: string) {
  await delay(300)
  const email = parseInput(requestInput, { email: emailInput }).email.trim().toLowerCase()
  const account = db.users.find((u) => u.email.toLowerCase() === email)
  if (!account) return { email, simulatedEmail: null as ResetEmail | null }

  const identifier = `${RESET_PREFIX}${account.id}`
  const token = newId()
  db.verifications = db.verifications.filter((v) => v.identifier !== identifier)
  insertRow('verifications', {
    identifier,
    value: token,
    expiresAt: new Date(now().getTime() + LINK_TTL_MINUTES * 60_000).toISOString(),
  })
  const link = `/reset-password?token=${token}`
  const firstName = account.name.split(' ')[0] ?? account.name
  const subject = 'Reset your Qatar Tourism Academy password'
  const body = `Hello ${firstName}, use the demo link to choose a new password. It expires in ${LINK_TTL_MINUTES} minutes. This is a simulated email: no external email was sent.`
  notify({
    eventId: `password-reset:${account.id}:${now().getTime()}`,
    kind: 'password_reset',
    recipientIds: [account.id],
    subject,
    body,
  })
  commit()
  return out({
    email,
    simulatedEmail: {
      label: SIMULATED_EMAIL_LABEL,
      to: email,
      subject,
      body,
      link,
    } as ResetEmail | null,
  })
}

/** Sets a new password from a valid, unexpired reset link. 400 INVALID_TOKEN otherwise. */
export async function resetPassword(input: { token: string; newPassword: string }) {
  await delay(300)
  const { token, newPassword } = parseInput(resetInput, input)
  const instant = nowIso()
  const row = db.verifications.find(
    (v) => v.identifier.startsWith(RESET_PREFIX) && v.value === token && v.expiresAt > instant,
  )
  const account = row
    ? db.users.find((u) => u.id === row.identifier.slice(RESET_PREFIX.length))
    : undefined
  if (!row || !account) {
    throw new ApiError(400, 'INVALID_TOKEN', 'This reset link is not valid or has expired.')
  }
  db.passwords[account.id] = newPassword
  db.verifications = db.verifications.filter((v) => v.id !== row.id)
  recordAudit(
    { id: account.id, role: account.role, name: account.name },
    {
      action: 'account.password_reset',
      objectType: 'user',
      objectId: account.id,
      after: { method: 'simulated demo link' },
    },
  )
  commit()
  return { reset: true as const }
}
