import type { CredentialLifecycle } from '@shared/constants/enums'
import type { DemoSettings } from '@shared/types/db'
import { db, delay, now, out, QATAR_TIMEZONE, requireCapability } from './api'
import { renderCertificatePdf } from './certificates/pdf'
import { advanceDemoClock, getDemoClock, resetDemoClock } from './clock.service'
import { credentialViews } from './credentials/lifecycle'
import { runReminderSweep } from './credentials/reminders'
import { REFRESHER_CPD_HOURS, RENEWAL_CHECK_PASS_PERCENT } from './credentials/renewal-check'
import { CREDENTIAL_CPD_HOURS, CREDENTIAL_RULE_VERSION } from './credentials/rules'
import { getDemoSettings, updateDemoSettings } from './demo-settings.service'

/**
 * Admin side of Certificates and CPD (SPEC §7): rules, issued credentials, the renewal queue and
 * the demo clock with its reminder sweep. Every function needs `credential.manage` except the
 * clock, which needs `demo.clock`.
 */

export const getClock = getDemoClock

/** Advances the clock, then runs the reminder sweep so reminders and expiries appear at once. */
export async function advanceClock(days: number) {
  const clock = await advanceDemoClock(days)
  const sweep = runReminderSweep()
  return out({ clock, sweep })
}

export async function resetClock() {
  const clock = await resetDemoClock()
  const sweep = runReminderSweep()
  return out({ clock, sweep })
}

export async function getRules() {
  await delay()
  requireCapability('credential.manage')
  const settings = await getDemoSettings()
  return out({
    settings,
    ruleVersion: CREDENTIAL_RULE_VERSION,
    credentialCpdHours: CREDENTIAL_CPD_HOURS,
    refresherCpdHours: REFRESHER_CPD_HOURS,
    renewalCheckPassPercent: RENEWAL_CHECK_PASS_PERCENT,
  })
}

export async function updateRules(patch: Partial<DemoSettings>) {
  return updateDemoSettings(patch)
}

export type ValidityFilter = CredentialLifecycle | 'all'

export async function listIssued(filter: { validity?: ValidityFilter; search?: string } = {}) {
  await delay()
  requireCapability('credential.manage')
  runReminderSweep()
  const all = credentialViews(db.certificates, { certifiedOnly: true })
  const counts: Record<ValidityFilter, number> = {
    all: all.length,
    active: 0,
    expiring_soon: 0,
    expired: 0,
    revoked: 0,
    superseded: 0,
  }
  for (const c of all) counts[c.lifecycle] += 1
  const term = filter.search?.trim().toLowerCase()
  const items = all.filter(
    (c) =>
      (!filter.validity || filter.validity === 'all' || c.lifecycle === filter.validity) &&
      (!term ||
        [c.code, c.learnerName, c.learnerDisplayId].some((v) => v.toLowerCase().includes(term))),
  )
  return out({ items, counts })
}

export async function listRenewals() {
  await delay()
  requireCapability('credential.manage')
  runReminderSweep()
  const items = credentialViews(db.certificates, { certifiedOnly: true })
    .filter(
      (c) =>
        c.lifecycle === 'expiring_soon' ||
        c.lifecycle === 'expired' ||
        Boolean(c.renewal?.completedAt),
    )
    .map((c) => ({
      ...c,
      renewalState: c.renewal?.completedAt
        ? ('completed' as const)
        : c.renewal
          ? ('in_progress' as const)
          : ('not_started' as const),
    }))
    .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''))
  return out({ items })
}

export async function listTemplates() {
  await delay()
  requireCapability('credential.manage')
  const programme = db.programmes.find((p) => p.certificationEnabled)
  return out({
    items: [
      {
        id: 'tpl-programme-a',
        name: `${programme?.title ?? 'Program A'} certificate`,
        programmeCode: programme?.code ?? 'A',
        ruleVersion: CREDENTIAL_RULE_VERSION,
        watermark: 'SAMPLE — NOT VALID',
        issued: db.certificates.filter((c) => c.programmeId === programme?.id).length,
      },
    ],
  })
}

const sampleDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: QATAR_TIMEZONE,
  }).format(new Date(iso))

/** A sample of the template with dummy learner data: "SAMPLE — NOT VALID" watermark, dummy link. */
export async function templateSamplePdf() {
  await delay()
  requireCapability('credential.manage')
  const programme = db.programmes.find((p) => p.certificationEnabled)
  const issued = now().toISOString()
  const expires = new Date(now())
  expires.setUTCMonth(expires.getUTCMonth() + db.settings.credentialValidityMonths)
  const bytes = await renderCertificatePdf({
    learnerName: 'Sample Learner',
    programmeTitle: programme?.title ?? 'Tourism Service Professional',
    code: 'QTA-DEMO-A-000000',
    completedOnLabel: sampleDate(issued),
    status: 'issued',
    verifyUrl: `${typeof window === 'undefined' ? '' : window.location.origin}/certificates/verify/QTA-DEMO-A-000000`,
    expiresOnLabel: sampleDate(expires.toISOString()),
    lifecycleLabel: 'Sample',
  })
  return {
    blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
    filename: 'certificate-template-sample.pdf',
  }
}
