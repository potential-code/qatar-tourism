import type { CredentialLifecycle } from '../constants/enums'

/**
 * Credential lifecycle helpers (29 Oct update). The lifecycle is derived, never stored, so the
 * demo clock moves it: advance the clock and a credential turns expiring_soon, then expired.
 *
 * Precedence: revoked, superseded, expired, expiring_soon, active.
 */

const DAY_MS = 86_400_000

export interface LifecycleCertificate {
  id: string
  status: 'issued' | 'revoked'
  /** ISO instant, or null for a credential with no expiry. */
  expiresAt: string | null
}

/** Ids of credentials another credential renews (`supersedesId`): these read as superseded. */
export function supersededIds(
  certificates: readonly { supersedesId: string | null }[],
): Set<string> {
  const ids = new Set<string>()
  for (const cert of certificates) if (cert.supersedesId) ids.add(cert.supersedesId)
  return ids
}

/** The "expiring soon" window: the largest configured reminder interval (60 days by default). */
export function expiringSoonDays(reminderDaysBefore: readonly number[]): number {
  return reminderDaysBefore.length > 0 ? Math.max(...reminderDaysBefore) : 0
}

/** Whole days from `nowMs` to expiry, rounded up; negative once expired; null with no expiry. */
export function daysToExpiry(expiresAt: string | null, nowMs: number): number | null {
  if (!expiresAt) return null
  return Math.ceil((Date.parse(expiresAt) - nowMs) / DAY_MS)
}

export function credentialLifecycle(
  cert: LifecycleCertificate,
  nowMs: number,
  options: { superseded: ReadonlySet<string>; expiringSoonDays: number },
): CredentialLifecycle {
  if (cert.status === 'revoked') return 'revoked'
  if (options.superseded.has(cert.id)) return 'superseded'
  if (!cert.expiresAt) return 'active'
  const expires = Date.parse(cert.expiresAt)
  if (expires <= nowMs) return 'expired'
  if (expires - nowMs <= options.expiringSoonDays * DAY_MS) return 'expiring_soon'
  return 'active'
}

/** A copy of `date` moved by whole calendar months (UTC). */
export function addMonths(date: Date | string, months: number): Date {
  const copy = new Date(typeof date === 'string' ? Date.parse(date) : date.getTime())
  copy.setUTCMonth(copy.getUTCMonth() + months)
  return copy
}
