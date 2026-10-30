import { crmLearnerId } from '@shared/utils/identity'
import { db, insertRow, nowIso } from '../api'

/**
 * Certification events for the (simulated) CRM event log: issue, renewal, expiry and revocation
 * (SPEC §7 "updates appear in the CRM event log"). Idempotent: the same credential and kind is
 * recorded once, so a retry or a second page load never duplicates it. Synchronous; the caller
 * commits.
 */

export type CertificationEventKind = 'issued' | 'renewed' | 'expired' | 'revoked'

const nextEventId = (): string => {
  const highest = db.crmEvents.reduce((max, e) => {
    const n = /^EVT-(\d+)$/.exec(e.eventId)
    return n ? Math.max(max, Number(n[1])) : max
  }, 0)
  return `EVT-${String(highest + 1).padStart(4, '0')}`
}

export function emitCertificationEvent(
  kind: CertificationEventKind,
  cert: { id: string; code: string; learnerId: string; expiresAt: string | null },
): boolean {
  const dedupeKey = `cert:${cert.code}:${kind}`
  if (db.crmEvents.some((e) => e.payload.dedupeKey === dedupeKey)) return false
  const profile = db.profiles.find((p) => p.userId === cert.learnerId)
  const instant = nowIso()
  insertRow('crmEvents', {
    eventId: nextEventId(),
    type: 'certification',
    direction: 'lms_to_crm',
    learnerId: cert.learnerId,
    externalLearnerId: profile ? crmLearnerId(profile.learnerCode) : null,
    entityId: cert.id,
    status: 'processed',
    attempts: 1,
    payload: {
      dedupeKey,
      action: kind,
      credentialCode: cert.code,
      expiresAt: cert.expiresAt,
      simulated: true,
    },
    occurredAt: instant,
    processedAt: instant,
  })
  return true
}
