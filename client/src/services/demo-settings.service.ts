import type { DemoSettings } from '@shared/types/db'
import { ApiError } from '@/lib/api-error'
import { commit, db, delay, out, requireCapability, requireUser } from './api'
import { audit } from './audit.service'

/**
 * "Demo settings — subject to Qatar Tourism confirmation": the configurable thresholds every
 * 29 Oct feature reads (seat-offer window, credential validity, CPD target and unit, reminder
 * intervals, Program B CPD). Services read the live record with `demoSettings()`; the UI reads
 * and edits it through the async functions below.
 */

/** The live settings record (synchronous, for use inside other services). */
export function demoSettings(): DemoSettings {
  return db.settings
}

/** Settings for the screens that show or edit thresholds. Any signed-in user may read. */
export async function getDemoSettings(): Promise<DemoSettings> {
  await delay()
  requireUser()
  return out(db.settings)
}

/** Changes settings. Admins with credential rights only; audited with before and after. */
export async function updateDemoSettings(patch: Partial<DemoSettings>): Promise<DemoSettings> {
  await delay()
  requireCapability('credential.manage')
  const next = { ...db.settings, ...patch }
  if (next.seatOfferWindowHours < 1)
    throw ApiError.badRequest('The offer window is at least 1 hour')
  if (next.credentialValidityMonths < 1)
    throw ApiError.badRequest('Credential validity is at least 1 month')
  if (next.cpdTarget < 0) throw ApiError.badRequest('The CPD target cannot be negative')
  if (next.cpdHoursPerCredit <= 0)
    throw ApiError.badRequest('The hours-per-credit conversion must be above zero')
  if (next.reminderDaysBefore.some((d) => !Number.isInteger(d) || d < 1))
    throw ApiError.badRequest('Reminder intervals are whole days of at least 1')
  const before = { ...db.settings }
  Object.assign(db.settings, {
    ...next,
    reminderDaysBefore: [...next.reminderDaysBefore].sort((a, b) => b - a),
  })
  audit({
    action: 'settings.update',
    objectType: 'demo_settings',
    objectId: 'demo-settings',
    before: before as unknown as Record<string, unknown>,
    after: { ...db.settings },
    reason: 'Demo settings changed',
  })
  commit()
  return out(db.settings)
}
