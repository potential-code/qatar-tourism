import { addMonths } from '@shared/utils/credentials'
import { db, insertRow, nowIso } from '../api'
import { demoSettings } from '../demo-settings.service'

/**
 * Credential terms a new Academy credential is issued with. Validity comes from the live demo
 * settings (12 months by default), never a literal.
 */

export const CREDENTIAL_RULE_VERSION = 'A-cert-v1'

/** Demo setting: CPD hours one Academy credential counts for. Subject to Qatar Tourism confirmation. */
export const CREDENTIAL_CPD_HOURS = 4

export function newCredentialTerms() {
  return {
    expiresAt: addMonths(nowIso(), demoSettings().credentialValidityMonths).toISOString(),
    ruleVersion: CREDENTIAL_RULE_VERSION,
    cpdHours: CREDENTIAL_CPD_HOURS,
  }
}

/** The CPD ledger line for a freshly issued credential (one per credential, as the seed does). */
export function addCredentialCpdLine(cert: {
  id: string
  learnerId: string
  cpdHours: number
  issuedAt: string
}) {
  if (db.cpdLedger.some((l) => l.certificateId === cert.id)) return
  insertRow('cpdLedger', {
    learnerId: cert.learnerId,
    source: 'academy',
    hours: cert.cpdHours,
    unit: demoSettings().cpdUnit,
    status: 'earned',
    title: 'Program A certificate',
    earnedOn: cert.issuedAt.slice(0, 10),
    certificateId: cert.id,
  })
}
