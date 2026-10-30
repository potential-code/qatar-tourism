import type { ProcessOutcome } from '../crm/events'
import { findLmsEvent, reportLmsEvent } from '../crm/lms-events'

/**
 * Certification events for the (simulated) CRM event log: issue, renewal, expiry and revocation
 * (SPEC §7 "updates appear in the CRM event log", §8 Certification). They go through the one LMS
 * to CRM entry point, so each credential and kind appears ONCE in the sync log, with the same
 * shape the CRM scenario uses, and respects a paused sync or simulated outage (the event is then
 * queued, never lost). Synchronous; the caller commits.
 */

export type CertificationEventKind = 'issued' | 'renewed' | 'expired' | 'revoked'

export const certificationKey = (code: string, kind: CertificationEventKind): string =>
  `cert:${code}:${kind}`

type Credential = { id: string; code: string; learnerId: string; expiresAt: string | null }

/** Records the event once. Returns true when this call added it. */
export function emitCertificationEvent(kind: CertificationEventKind, cert: Credential): boolean {
  if (findLmsEvent(certificationKey(cert.code, kind))) return false
  return reportCertificationEvent(kind, cert) !== null
}

/** The stored event for the credential and kind, recording it first if it is not there yet. */
export function reportCertificationEvent(
  kind: CertificationEventKind,
  cert: Credential,
): ProcessOutcome | null {
  return reportLmsEvent({
    dedupeKey: certificationKey(cert.code, kind),
    type: 'certification',
    learnerId: cert.learnerId,
    entityId: cert.id,
    allowUnlinked: true,
    payload: {
      action: kind,
      credentialId: cert.code,
      credentialCode: cert.code,
      expiresAt: cert.expiresAt,
      simulated: false,
    },
  })
}
