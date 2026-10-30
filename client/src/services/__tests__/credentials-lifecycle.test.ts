import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import { issueCertificateIfMissing } from '../certificates/issue'
import { now } from '../clock'
import { advanceClock, listIssued, listRenewals, resetClock, updateRules } from '../cpd.service'
import { getMyRecord } from '../credentials/learner-record.service'
import { lifecycleOf } from '../credentials/lifecycle'
import { runReminderSweep } from '../credentials/reminders'
import {
  completeRefresher,
  completeRenewal,
  completeRetraining,
  getRenewal,
  startRenewal,
  submitRenewalCheck,
} from '../credentials/renewal.service'
import { RENEWAL_CHECK_QUESTIONS } from '../credentials/renewal-check'
import { listMine as listExternal, review, submit } from '../external-certificates.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb
const ADMIN = 'user-admin'
const MARIAM = 'user-l0042'
const MARIAM_CERT = 'QTA-DEMO-A-P25-0001'
const EXPIRED_CERT = 'QTA-DEMO-A-P25-0002'
const DAY = 86_400_000

beforeEach(() => {
  db = freshDemo()
})

const cert = (code: string) => {
  const row = db.certificates.find((c) => c.code === code)
  if (!row) throw new Error(`no certificate ${code}`)
  return row
}
const lifecycle = (code: string) => lifecycleOf(cert(code))
const correctAnswers = () =>
  Object.fromEntries(RENEWAL_CHECK_QUESTIONS.map((q) => [q.id, q.correct]))
const wrongAnswers = () =>
  Object.fromEntries(RENEWAL_CHECK_QUESTIONS.map((q) => [q.id, q.correct === 'a' ? 'b' : 'a']))
const reminderRows = (eventPrefix: string) =>
  db.notifications.filter((n) => n.eventId.startsWith(eventPrefix) && n.channel === 'in_app')

describe('lifecycle follows the demo clock', () => {
  test('active becomes expiring soon becomes expired as the clock advances', async () => {
    const current = db.certificates.find(
      (c) => !c.evidence.priorCycle && lifecycleOf(c) === 'active' && c.expiresAt,
    )
    if (!current?.expiresAt) throw new Error('seed has no active credential')
    const days = Math.ceil((Date.parse(current.expiresAt) - now().getTime()) / DAY)
    actAs(db, ADMIN)

    await advanceClock(days - 30)
    expect(lifecycleOf(current)).toBe('expiring_soon')
    await advanceClock(31)
    expect(lifecycleOf(current)).toBe('expired')
    await resetClock()
    expect(lifecycleOf(current)).toBe('active')
  })

  test('seeded states: expiring, expired, superseded and revoked', () => {
    expect(lifecycle(MARIAM_CERT)).toBe('expiring_soon')
    expect(lifecycle(EXPIRED_CERT)).toBe('expired')
    expect(lifecycle('QTA-DEMO-A-P25-0003')).toBe('superseded')
    expect(lifecycle('QTA-DEMO-A-P25-0004')).toBe('revoked')
  })

  test('the admin list filters by validity and counts every state', async () => {
    actAs(db, ADMIN)
    const expired = await listIssued({ validity: 'expired' })
    expect(expired.items.every((c) => c.lifecycle === 'expired')).toBe(true)
    expect(expired.counts.expired).toBe(expired.items.length)
    const all = await listIssued()
    expect(all.counts.all).toBe(all.items.length)
    expect(all.counts.revoked).toBeGreaterThanOrEqual(1)
    expect(all.counts.superseded).toBeGreaterThanOrEqual(1)
  })
})

describe('reminders', () => {
  test('are sent once per credential and interval, however often the sweep runs', async () => {
    actAs(db, MARIAM)
    // 25 days out: the 30-day interval is already crossed when the record loads.
    await getMyRecord()
    await getMyRecord()
    expect(reminderRows(`cert-reminder:${MARIAM_CERT}:30`)).toHaveLength(1)
    expect(reminderRows(`cert-reminder:${MARIAM_CERT}:7`)).toHaveLength(0)
    // The email copy is simulated, never "sent".
    const email = db.notifications.find(
      (n) => n.eventId === `cert-reminder:${MARIAM_CERT}:30` && n.channel === 'email',
    )
    expect(email?.state).toBe('simulated')

    actAs(db, ADMIN)
    await advanceClock(19)
    runReminderSweep()
    runReminderSweep()
    expect(reminderRows(`cert-reminder:${MARIAM_CERT}:7`)).toHaveLength(1)
    expect(reminderRows(`cert-reminder:${MARIAM_CERT}:30`)).toHaveLength(1)
  })

  test('a long jump sends the tightest crossed interval once and an expiry notice later', async () => {
    actAs(db, ADMIN)
    await advanceClock(26)
    expect(reminderRows(`cert-expired:${MARIAM_CERT}`)).toHaveLength(1)
    await advanceClock(1)
    expect(reminderRows(`cert-expired:${MARIAM_CERT}`)).toHaveLength(1)
    // Expiry also reaches the (simulated) CRM event log, once.
    const events = db.crmEvents.filter((e) => e.payload.dedupeKey === `cert:${MARIAM_CERT}:expired`)
    expect(events).toHaveLength(1)
  })
})

describe('renewal', () => {
  test('issues a new credential linked by supersedesId and never extends the old one', async () => {
    const before = cert(MARIAM_CERT)
    const oldExpiry = before.expiresAt
    actAs(db, MARIAM)

    const started = await startRenewal(MARIAM_CERT)
    expect(started.eligible).toBe(true)
    expect(started.steps.map((s) => s.key)).toEqual(['refresher', 'assessment', 'cpd'])
    // Out-of-order and incomplete attempts are refused.
    await expect(completeRenewal(MARIAM_CERT)).rejects.toThrow()
    await expect(submitRenewalCheck(MARIAM_CERT, correctAnswers())).rejects.toThrow()

    const afterRefresher = await completeRefresher(MARIAM_CERT)
    // 6 h earned plus the 2 h refresher reaches the 8 h target.
    expect(afterRefresher.cpd.remaining).toBe(0)
    const result = await submitRenewalCheck(MARIAM_CERT, correctAnswers())
    expect(result.attempt.passed).toBe(true)

    const renewed = await completeRenewal(MARIAM_CERT)
    const fresh = cert(renewed.code)
    expect(fresh.supersedesId).toBe(before.id)
    expect(fresh.id).not.toBe(before.id)
    expect(Date.parse(fresh.expiresAt ?? '')).toBeGreaterThan(Date.parse(oldExpiry ?? ''))
    // The old credential keeps its own expiry and its row, and now reads as superseded.
    expect(cert(MARIAM_CERT).expiresAt).toBe(oldExpiry)
    expect(lifecycle(MARIAM_CERT)).toBe('superseded')
    expect(lifecycleOf(fresh)).toBe('active')
    // A second completion cannot mint another credential.
    await expect(completeRenewal(MARIAM_CERT)).rejects.toThrow()
    expect(db.certificates.filter((c) => c.supersedesId === before.id)).toHaveLength(1)
    // The refresher CPD line exists once.
    expect(db.cpdLedger.filter((l) => l.title === 'Renewal refresher course')).toHaveLength(1)
    // The CRM log got the renewal event.
    expect(db.crmEvents.some((e) => e.payload.dedupeKey === `cert:${renewed.code}:renewed`)).toBe(
      true,
    )
  })

  test('a failed check assigns the short retraining path before another try', async () => {
    actAs(db, MARIAM)
    await startRenewal(MARIAM_CERT)
    await completeRefresher(MARIAM_CERT)
    const failed = await submitRenewalCheck(MARIAM_CERT, wrongAnswers())
    expect(failed.attempt.passed).toBe(false)
    expect(failed.view.steps.map((s) => s.key)).toContain('retraining')
    expect(failed.view.retrainingReason).toBe('failed_check')
    await expect(submitRenewalCheck(MARIAM_CERT, correctAnswers())).rejects.toThrow()
    await completeRetraining(MARIAM_CERT)
    const passed = await submitRenewalCheck(MARIAM_CERT, correctAnswers())
    expect(passed.view.canComplete).toBe(true)
    expect(db.certificates.filter((c) => c.supersedesId === cert(MARIAM_CERT).id)).toHaveLength(0)
  })

  test('an expired credential starts with retraining and is never extended', async () => {
    const expired = cert(EXPIRED_CERT)
    actAs(db, expired.learnerId)
    const view = await startRenewal(EXPIRED_CERT)
    expect(view.steps[0]?.key).toBe('retraining')
    expect(view.retrainingReason).toBe('expired')
    await expect(completeRefresher(EXPIRED_CERT)).rejects.toThrow()
    await completeRetraining(EXPIRED_CERT)
    await completeRefresher(EXPIRED_CERT)
    expect(cert(EXPIRED_CERT).expiresAt).toBe(expired.expiresAt)
    expect(lifecycle(EXPIRED_CERT)).toBe('expired')
    expect((await getRenewal(EXPIRED_CERT)).completed).toBe(false)

    actAs(db, ADMIN)
    const queue = await listRenewals()
    const row = queue.items.find((i) => i.code === EXPIRED_CERT)
    expect(row?.renewalState).toBe('in_progress')
  })

  test('only a credential that is expiring soon or expired can start renewal', async () => {
    const active = db.certificates.find(
      (c) => !c.evidence.priorCycle && lifecycleOf(c) === 'active',
    )
    if (!active) throw new Error('seed has no active credential')
    actAs(db, active.learnerId)
    await expect(startRenewal(active.code)).rejects.toThrow()
    // And another learner's credential is invisible.
    actAs(db, MARIAM)
    await expect(startRenewal(active.code)).rejects.toThrow()
  })
})

describe('external certificates', () => {
  const pdf = () =>
    new File([new TextEncoder().encode('%PDF-1.4\n%demo\n')], 'evidence.pdf', {
      type: 'application/pdf',
    })
  const draft = (overrides: Record<string, unknown> = {}) => ({
    title: 'Customer Care Essentials',
    issuer: 'Demo Skills Academy',
    externalRef: 'DSA-0042-X',
    issuedOn: '2026-09-01',
    expiresOn: '',
    claimedAmount: 1.5,
    unit: 'hours' as const,
    competency: '' as const,
    verificationUrl: '',
    file: pdf(),
    ...overrides,
  })

  test('stays pending with no approved CPD until approved, and credits once', async () => {
    actAs(db, MARIAM)
    const before = (await getMyRecord()).cpd
    const created = await submit(draft())
    expect(created.status).toBe('pending')
    const record = await getMyRecord()
    expect(record.cpd.earned).toBe(before.earned)
    expect(record.cpd.pending).toBe(before.pending + 1.5)
    const request = db.approvalRequests.find((r) => r.externalCertificateId === created.id)
    expect(request?.type).toBe('external_certificate')
    expect(request?.status).toBe('pending')

    actAs(db, ADMIN)
    const approved = await review(created.id, { action: 'approve', recognisedAmount: 1 })
    expect(approved.status).toBe('verified')
    expect(approved.recognisedAmount).toBe(1)
    expect(approved.reviewerName).toBeTruthy()
    expect(approved.reviewedAt).toBeTruthy()
    expect(db.approvalRequests.find((r) => r.id === request?.id)?.status).toBe('approved')

    actAs(db, MARIAM)
    const after = (await getMyRecord()).cpd
    expect(after.earned).toBe(before.earned + 1)
    expect(after.pending).toBe(before.pending)

    // Replays and duplicates add nothing.
    actAs(db, ADMIN)
    await expect(review(created.id, { action: 'approve', recognisedAmount: 1 })).rejects.toThrow()
    expect(db.cpdLedger.filter((l) => l.externalCertificateId === created.id)).toHaveLength(1)
    actAs(db, MARIAM)
    await expect(submit(draft())).rejects.toThrow()
    expect((await getMyRecord()).cpd.earned).toBe(before.earned + 1)
  })

  test('a second row for an already recognised certificate cannot be approved', async () => {
    actAs(db, MARIAM)
    const first = await submit(draft())
    actAs(db, ADMIN)
    await review(first.id, { action: 'approve', recognisedAmount: 1.5 })
    const twin = structuredClone(db.externalCertificates.find((c) => c.id === first.id))
    if (!twin) throw new Error('missing')
    db.externalCertificates.push({ ...twin, id: 'twin', status: 'pending', recognisedAmount: null })
    await expect(review('twin', { action: 'approve', recognisedAmount: 1.5 })).rejects.toThrow(
      /already recognised/,
    )
  })

  test('validates the form and the PDF, rejects with a reason, asks for information', async () => {
    actAs(db, MARIAM)
    await expect(submit(draft({ file: null }))).rejects.toThrow()
    await expect(submit(draft({ title: '' }))).rejects.toThrow()
    await expect(submit(draft({ claimedAmount: 0 }))).rejects.toThrow()
    await expect(submit(draft({ issuedOn: '2999-01-01' }))).rejects.toThrow()
    await expect(
      submit(draft({ file: new File(['hello'], 'evidence.pdf', { type: 'application/pdf' }) })),
    ).rejects.toThrow()
    await expect(
      submit(draft({ file: new File(['%PDF-1'], 'evidence.txt', { type: 'text/plain' }) })),
    ).rejects.toThrow()
    expect(
      (await listExternal()).items.filter((i) => i.title === 'Customer Care Essentials'),
    ).toHaveLength(0)

    const created = await submit(draft())
    actAs(db, ADMIN)
    await expect(review(created.id, { action: 'reject', reason: 'no' })).rejects.toThrow()
    const info = await review(created.id, {
      action: 'request_info',
      reason: 'Please add the issue date page',
    })
    expect(info.status).toBe('info_requested')
    // Not decided yet: the ledger line is still pending and nothing is approved.
    expect(db.cpdLedger.find((l) => l.externalCertificateId === created.id)?.status).toBe('pending')
  })
})

describe('Program B', () => {
  test('never gets a programme credential, and its CPD rule is off by default', async () => {
    const programmeB = db.programmes.find((p) => p.code === 'B')
    expect(programmeB?.certificationEnabled).toBe(false)
    expect(db.certificates.some((c) => c.programmeId === programmeB?.id)).toBe(false)

    const enrolment = db.enrolments.find((e) => e.programmeId === programmeB?.id)
    if (!enrolment) throw new Error('no Program B enrolment')
    const context = {
      id: enrolment.id,
      learnerId: enrolment.learnerId,
      programmeId: enrolment.programmeId,
      programme: 'B',
      certificationEnabled: false,
    } as unknown as Parameters<typeof issueCertificateIfMissing>[0]
    expect(issueCertificateIfMissing(context, {} as never)).toBeNull()
    expect(db.certificates.some((c) => c.programmeId === programmeB?.id)).toBe(false)

    actAs(db, MARIAM)
    const record = await getMyRecord()
    expect(record.credentials.every((c) => c.programmeCode === 'A')).toBe(true)
    const bRows = record.history.filter((h) => h.programmeCode === 'B' && h.status === 'completed')
    expect(bRows.length).toBeGreaterThan(0)
    expect(bRows.every((h) => h.result.kind === 'completed_no_certificate')).toBe(true)
    expect(record.cpd.lines.some((l) => l.derived)).toBe(false)

    actAs(db, ADMIN)
    await updateRules({ programmeBCpdEnabled: true })
    actAs(db, MARIAM)
    const withRule = await getMyRecord()
    const derived = withRule.cpd.lines.filter((l) => l.derived)
    expect(derived).toHaveLength(bRows.length)
    expect(withRule.cpd.earned).toBeCloseTo(record.cpd.earned + bRows.length * 0.5, 5)
    expect(withRule.credentials).toHaveLength(record.credentials.length)
  })
})
