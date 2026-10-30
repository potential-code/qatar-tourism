import type { LicenceStatus } from '@shared/constants/enums'
import { db } from './api'

/**
 * Licence status (SPEC §7): a separate field, sourced from the configured system (the CRM, as an
 * illustrative authority). A passed exam or a valid certificate never implies a valid licence,
 * so nothing here reads credentials. An LMS-to-CRM change request stays pending until the CRM
 * acknowledges it.
 */

export interface LicenceView {
  tracked: boolean
  status: LicenceStatus | null
  source: 'crm'
  pendingRequest: { requestedStatus: LicenceStatus; requestedAt: string; reason: string } | null
}

export function licenceFor(learnerId: string): LicenceView {
  const row = db.licenceStatus.find((l) => l.learnerId === learnerId)
  return {
    tracked: Boolean(row),
    status: row?.status ?? null,
    source: 'crm',
    pendingRequest: row?.pendingRequest ? { ...row.pendingRequest } : null,
  }
}
