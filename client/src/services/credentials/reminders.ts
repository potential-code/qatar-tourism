import { daysToExpiry } from '@shared/utils/credentials'
import { commit, db, now } from '../api'
import { demoSettings } from '../demo-settings.service'
import { notify } from '../notifications.service'
import { emitCertificationEvent } from './events'
import { lifecycleOf } from './lifecycle'

/**
 * Reminders and expiry (SPEC §7): 60, 30 and 7 days before expiry (configurable), then an expiry
 * notice. Runs on load and whenever the demo clock moves. Per credential only the tightest
 * interval already crossed is sent, so a jump of weeks sends one message, not three. Every
 * message carries a deterministic event id, which `notify` dedupes, so running the sweep any
 * number of times never repeats a reminder. Emails stay simulated.
 */

export interface SweepResult {
  reminders: number
  expiries: number
}

export function runReminderSweep(): SweepResult {
  const settings = demoSettings()
  const nowMs = now().getTime()
  const intervals = [...settings.reminderDaysBefore].sort((a, b) => a - b)
  const superseded = new Set(
    db.certificates.flatMap((c) => (c.supersedesId ? [c.supersedesId] : [])),
  )
  const result: SweepResult = { reminders: 0, expiries: 0 }

  for (const cert of db.certificates) {
    const lifecycle = lifecycleOf(cert, superseded)
    const days = daysToExpiry(cert.expiresAt, nowMs)
    if (days === null) continue
    const programme = db.programmes.find((p) => p.id === cert.programmeId)
    const title = programme?.title ?? 'Program A'

    if (lifecycle === 'expiring_soon') {
      const crossed = intervals.find((d) => days <= d)
      if (crossed === undefined) continue
      const created = notify({
        eventId: `cert-reminder:${cert.code}:${crossed}`,
        kind: 'certificate.reminder',
        recipientIds: [cert.learnerId],
        subject: `Renewal due: your ${title} certificate expires in ${days} day${days === 1 ? '' : 's'}`,
        body: `Your certificate ${cert.code} expires soon. Open My Learning Record and choose Start renewal. Reminder interval: ${crossed} days before expiry (demo setting).`,
      })
      if (created > 0) result.reminders += 1
    } else if (lifecycle === 'expired') {
      const created = notify({
        eventId: `cert-expired:${cert.code}`,
        kind: 'certificate.expired',
        recipientIds: [cert.learnerId],
        subject: `Your ${title} certificate has expired`,
        body: `Certificate ${cert.code} is no longer valid. It is not extended: start renewal to follow a short retraining path and earn a new credential.`,
      })
      if (created > 0) result.expiries += 1
      emitCertificationEvent('expired', cert)
    }
  }
  if (result.reminders + result.expiries > 0) commit()
  return result
}
