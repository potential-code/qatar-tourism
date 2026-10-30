import type { CredentialLifecycle } from '@shared/constants/enums'
import type { CertificateRow } from '@shared/types/db'
import {
  credentialLifecycle,
  daysToExpiry,
  expiringSoonDays,
  supersededIds,
} from '@shared/utils/credentials'
import { learnerDisplayId } from '@shared/utils/identity'
import { db, now } from '../api'
import { demoSettings } from '../demo-settings.service'

/**
 * Credential views (SPEC §7). The lifecycle is derived from expiry and the demo clock, never
 * stored, so advancing the clock moves a credential from Active to Expiring soon to Expired.
 */

export type NextAction =
  | 'none'
  /** Expiring soon, renewal not started. */
  | 'renewal_due'
  /** Renewal checklist started. */
  | 'renewal_in_progress'
  /** Expired: the renewal starts with a short retraining path. */
  | 'retraining'
  | 'renewed'
  | 'revoked'

export interface RenewalMarker {
  startedAt: string
  retrainingRequired: boolean
  completedAt: string | null
}

export interface CredentialView {
  id: string
  code: string
  learnerId: string
  learnerCode: string
  learnerDisplayId: string
  learnerName: string
  programmeCode: string
  programmeTitle: string
  lifecycle: CredentialLifecycle
  issuedAt: string
  expiresAt: string | null
  daysToExpiry: number | null
  cpdHours: number
  ruleVersion: string
  supersedesCode: string | null
  supersededByCode: string | null
  revokedAt: string | null
  revokeReason: string | null
  renewal: RenewalMarker | null
  nextAction: NextAction
  /** Rows from before the 29 Oct cycle keep this flag in their evidence. */
  priorCycle: boolean
}

/** The renewal block stored on the credential being renewed (`evidence.renewal`). */
export function renewalOf(cert: CertificateRow): Record<string, unknown> | null {
  const value = cert.evidence?.renewal
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export function lifecycleOf(
  cert: CertificateRow,
  supersededSet: ReadonlySet<string> = supersededIds(db.certificates),
): CredentialLifecycle {
  return credentialLifecycle(cert, now().getTime(), {
    superseded: supersededSet,
    expiringSoonDays: expiringSoonDays(demoSettings().reminderDaysBefore),
  })
}

function nextActionOf(lifecycle: CredentialLifecycle, renewal: RenewalMarker | null): NextAction {
  if (lifecycle === 'revoked') return 'revoked'
  if (lifecycle === 'superseded') return 'renewed'
  if (lifecycle === 'active') return 'none'
  if (renewal && !renewal.completedAt) return 'renewal_in_progress'
  return lifecycle === 'expired' ? 'retraining' : 'renewal_due'
}

/** Views of the given certificates (default: every certificate), newest issue first. */
export function credentialViews(
  rows: readonly CertificateRow[] = db.certificates,
  options: { certifiedOnly?: boolean } = {},
): CredentialView[] {
  const superseded = supersededIds(db.certificates)
  const byId = new Map(db.certificates.map((c) => [c.id, c]))
  const successorOf = new Map(
    db.certificates.filter((c) => c.supersedesId).map((c) => [c.supersedesId as string, c]),
  )
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  const nowMs = now().getTime()
  const views: CredentialView[] = []
  for (const cert of rows) {
    const programme = db.programmes.find((p) => p.id === cert.programmeId)
    // Program B never carries a programme certificate, even if a stray row existed.
    if (options.certifiedOnly && !programme?.certificationEnabled) continue
    const lifecycle = lifecycleOf(cert, superseded)
    const raw = renewalOf(cert)
    const renewal: RenewalMarker | null = raw
      ? {
          startedAt: String(raw.startedAt ?? ''),
          retrainingRequired: Boolean(raw.retrainingRequired),
          completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
        }
      : null
    const profile = profiles.get(cert.learnerId)
    views.push({
      id: cert.id,
      code: cert.code,
      learnerId: cert.learnerId,
      learnerCode: profile?.learnerCode ?? '',
      learnerDisplayId: profile ? learnerDisplayId(profile.learnerCode) : '',
      learnerName: cert.learnerName,
      programmeCode: programme?.code ?? 'A',
      programmeTitle: programme?.title ?? '',
      lifecycle,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      daysToExpiry: daysToExpiry(cert.expiresAt, nowMs),
      cpdHours: cert.cpdHours,
      ruleVersion: cert.ruleVersion,
      supersedesCode: cert.supersedesId ? (byId.get(cert.supersedesId)?.code ?? null) : null,
      supersededByCode: successorOf.get(cert.id)?.code ?? null,
      revokedAt: cert.revokedAt,
      revokeReason: cert.revokeReason,
      renewal,
      nextAction: nextActionOf(lifecycle, renewal),
      priorCycle: Boolean(cert.evidence?.priorCycle),
    })
  }
  return views.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
}
