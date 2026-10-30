import { beforeEach, describe, expect, test } from 'bun:test'
import { createDemoDb, type DemoDb } from '@/mocks/db'
import { match, SUGGESTED_PROMPTS } from '../ai-analytics/intents'
import { ask, listPrompts } from '../ai-analytics.service'
import { insertRow } from '../api'
import { decideApproval, getAttentionCounts } from '../approvals.service'
import * as admin from '../assessments/admin'
import { advanceClock } from '../cpd.service'
import { emitCertificationEvent } from '../credentials/events'
import { reportEnrolmentAck } from '../crm/lms-events'
import { getCrmCard, setCrmOutage } from '../crm.service'
import { resolveCrmMapping } from '../crm-mapping.service'
import { advanceCrmScenario } from '../crm-scenario.service'
import { resetDemoData } from '../demo.service'
import { getMyLicence, requestLicenceReview } from '../licence.service'
import { findEnrolment, loadEvidence } from '../progress/evidence'
import { itemSatisfied } from '../progress/rules'
import { requireUnitContext, writeUnit } from '../progress/units'
import { getReportPage } from '../reports.service'
import { actAs, freshDemo, TEST_REFERENCE_DATE } from './helpers'

/** Wave 2a: cross-lane CRM wiring, licence field, programme gate, reset, reports, AI Analytics. */

let db: DemoDb
const ADMIN = 'user-admin'
const MARIAM = 'user-l0042'
const IMPROVER = 'user-l0022'

beforeEach(() => {
  db = freshDemo()
})

const link = (learnerId: string, external: string) =>
  insertRow('crmMappings', {
    kind: 'learner',
    learnerId,
    externalLearnerId: external,
    matchState: 'matched',
  } as never)

const eventsWith = (prefix: string) =>
  db.crmEvents.filter((e) => String(e.payload.dedupeKey ?? '').startsWith(prefix))

describe('LMS events reach the CRM log once', () => {
  test('approval decisions acknowledge to the CRM for linked learners only', async () => {
    const pending = db.approvalRequests.filter(
      (r) => r.type === 'enrolment' && r.status === 'pending',
    )
    expect(pending.length).toBeGreaterThanOrEqual(2)
    const [first, second] = pending
    if (!first || !second) throw new Error('seed has no pending requests')
    link(first.learnerId, 'CRM-9001')
    actAs(db, ADMIN)

    await decideApproval(first.code, { decision: 'approve' })
    const acks = eventsWith('enrol-ack:')
    expect(acks).toHaveLength(1)
    expect(acks[0]?.direction).toBe('lms_to_crm')
    expect(acks[0]?.type).toBe('enrolment')
    expect(acks[0]?.payload.programmeCode).toBe('QT-A')
    expect(['approved', 'waitlisted']).toContain(acks[0]?.payload.acknowledgement as string)

    // An unlinked learner's decision is not reported.
    await decideApproval(second.code, { decision: 'reject', reason: 'Not eligible this cycle' })
    expect(eventsWith('enrol-ack:')).toHaveLength(1)
  })

  test('a rejection is acknowledged, and the same fact is stored once', async () => {
    const request = db.approvalRequests.find(
      (r) => r.type === 'enrolment' && r.status === 'pending',
    )
    if (!request) throw new Error('seed has no pending request')
    link(request.learnerId, 'CRM-9002')
    actAs(db, ADMIN)
    await decideApproval(request.code, { decision: 'reject', reason: 'Needs a prerequisite' })
    const [event] = eventsWith('enrol-ack:')
    expect(event?.payload.acknowledgement).toBe('rejected')
    const again = reportEnrolmentAck({
      learnerId: request.learnerId,
      programmeLetter: 'A',
      decision: 'rejected',
    })
    expect(again?.duplicate).toBe(true)
    expect(eventsWith('enrol-ack:')).toHaveLength(1)
  })

  test('a submitted post-assessment reports attempt id, score and pass or fail once', async () => {
    link(IMPROVER, 'CRM-0022')
    // Reuse the seeded engine attempt: report it as the close of an attempt would.
    const attempt = db.assessmentAttempts.find(
      (a) => a.learnerId === IMPROVER && a.ruleId !== null && a.score === 80,
    )
    expect(attempt).toBeTruthy()
    const { reportAttemptToCrm } = await import('../assessments/attempts')
    if (!attempt) return
    reportAttemptToCrm(attempt)
    reportAttemptToCrm(attempt)
    const events = eventsWith('exam:')
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('examination')
    expect(events[0]?.entityId).toBe(attempt.id)
    expect(events[0]?.payload).toMatchObject({
      attemptId: attempt.id,
      scorePercent: attempt.score,
      result: 'pass',
    })
  })

  test('certification events appear once with one shape and queue during an outage', async () => {
    const cert = db.certificates.find((c) => c.learnerId === MARIAM && c.code.includes('P25'))
    if (!cert) throw new Error('no Mariam credential')
    actAs(db, ADMIN)
    await setCrmOutage(true)
    expect(emitCertificationEvent('issued', cert)).toBe(true)
    expect(emitCertificationEvent('issued', cert)).toBe(false)
    const events = eventsWith(`cert:${cert.code}:issued`)
    expect(events).toHaveLength(1)
    expect(events[0]?.status).toBe('queued')
    expect(events[0]?.payload).toMatchObject({ action: 'issued', credentialId: cert.code })
  })

  test('completing a course reports completion once for a linked learner', () => {
    const programmeB = db.programmes.find((p) => p.code === 'B')
    const enrolment = findEnrolment(MARIAM, 'B')
    if (!programmeB || !enrolment) throw new Error('Mariam is not on Program B')
    const code = ['C01', 'C02', 'C03', 'C04', 'C05'].find((c) => {
      const ctx = (() => {
        try {
          return requireUnitContext(MARIAM, 'B', c)
        } catch {
          return null
        }
      })()
      return ctx && ctx.unit?.status !== 'completed'
    })
    if (!code) throw new Error('no open Program B unit')
    const ctx = requireUnitContext(MARIAM, 'B', code)
    writeUnit(ctx, { complete: true })
    writeUnit(requireUnitContext(MARIAM, 'B', code), { complete: true })
    const events = eventsWith(`completion:course:${enrolment.id}:${code}`)
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('completion')
    expect(events[0]?.payload.scope).toBe('course')
  })
})

describe('the CRM scenario reuses events the LMS already reported', () => {
  test('an enrolment acknowledgement already in the log is not logged a second time', async () => {
    actAs(db, ADMIN)
    const first = reportEnrolmentAck({
      learnerId: MARIAM,
      programmeLetter: 'A',
      decision: 'approved',
    })
    expect(first?.status).toBe('processed')
    await resolveCrmMapping('EVT-0003', 'A')
    await advanceCrmScenario()
    const s2 = await advanceCrmScenario()
    expect(s2.scenario.step).toBe(2)
    const acks = db.crmEvents.filter(
      (e) => e.type === 'enrolment' && e.direction === 'lms_to_crm' && e.learnerId === MARIAM,
    )
    expect(acks).toHaveLength(1)
    expect(s2.result.events[0]?.eventId).toBe(first?.eventId)
  })
})

describe('licence status', () => {
  test('the learner reads their own licence field, labelled as CRM-sourced', async () => {
    actAs(db, MARIAM)
    const licence = await getMyLicence()
    expect(licence).toMatchObject({ tracked: true, status: 'active', source: 'crm' })
    actAs(db, ADMIN)
    await expect(getMyLicence()).rejects.toMatchObject({ status: 403 })
  })

  test('a review request stays pending, is reported once and cannot be duplicated', async () => {
    actAs(db, ADMIN)
    const result = await requestLicenceReview(MARIAM, {
      requestedStatus: 'suspended',
      reason: 'Complaint received, please review',
    })
    expect(result.eventId).toBeTruthy()
    const row = db.licenceStatus.find((l) => l.learnerId === MARIAM)
    expect(row?.status).toBe('active')
    expect(row?.pendingRequest?.requestedStatus).toBe('suspended')
    expect(eventsWith('licence-review:')).toHaveLength(1)
    await expect(
      requestLicenceReview(MARIAM, { requestedStatus: 'expired', reason: 'Second ask' }),
    ).rejects.toMatchObject({ status: 409 })
    actAs(db, 'user-l0001')
    await expect(
      requestLicenceReview(MARIAM, { requestedStatus: 'expired', reason: 'Not allowed' }),
    ).rejects.toMatchObject({ status: 403 })
  })
})

describe('Program A certification gate follows the builder pass mark', () => {
  const postItem = () => {
    const enrolment = findEnrolment(IMPROVER, 'A')
    if (!enrolment) throw new Error('no enrolment')
    const evidence = loadEvidence(enrolment)
    const item = evidence.items.find((i) => i.kind === 'assessment_post')
    if (!item) throw new Error('no post item')
    return { evidence, item }
  }

  test('80 percent by default, and a published rule moves the gate', async () => {
    let { evidence, item } = postItem()
    expect(evidence.finalPassPercent).toBe(80)
    expect(itemSatisfied(evidence, item)).toBe(true) // seeded post score is 80

    actAs(db, ADMIN)
    const rule = (await admin.listRules()).items.find(
      (i) => i.programme === 'A' && i.kind === 'post',
    )
    if (!rule) throw new Error('no rule')
    await admin.publishRule({ ...rule.config, passPercent: 90 }, 'Raise the bar')
    ;({ evidence, item } = postItem())
    expect(evidence.finalPassPercent).toBe(90)
    expect(itemSatisfied(evidence, item)).toBe(false)
  })
})

describe('reset restores every 29 Oct table', () => {
  test('approvals, offers, attempts, grants, CRM queue, licence and the demo clock', async () => {
    actAs(db, ADMIN)
    await advanceClock(10)
    await requestLicenceReview(MARIAM, { requestedStatus: 'expired', reason: 'Reset check' })
    db.approvalRequests.splice(0, 2)
    db.seatOffers.push({ id: 'x' } as never)
    db.attemptGrants.push({ id: 'g' } as never)
    db.assessmentAttempts.splice(0, 3)
    db.crmEvents.length = 1
    db.questionBank.length = 0
    db.cpdLedger.length = 0
    db.xapiStatements.length = 0
    db.integrationSettings.length = 0
    expect(db.meta.clockOffsetDays).toBe(10)

    await resetDemoData()
    const seed = createDemoDb(TEST_REFERENCE_DATE)
    for (const table of [
      'approvalRequests',
      'seatOffers',
      'attemptGrants',
      'assessmentAttempts',
      'crmEvents',
      'crmMappings',
      'questionBank',
      'assessmentRules',
      'cpdLedger',
      'externalCertificates',
      'licenceStatus',
      'xapiStatements',
      'integrationSettings',
      'contentPackages',
      'certificates',
    ] as const) {
      expect(db[table].length).toBe(seed[table].length)
    }
    expect(db.crmEvents.map((e) => e.eventId)).toEqual(seed.crmEvents.map((e) => e.eventId))
    expect(db.meta.clockOffsetDays).toBe(0)
    expect(db.licenceStatus.find((l) => l.learnerId === MARIAM)?.pendingRequest).toBeNull()
  })
})

describe('reports reconcile with the dashboard', () => {
  test('pending approvals, waitlisted learners, locked accounts and the CRM card', async () => {
    actAs(db, ADMIN)
    const counts = await getAttentionCounts()
    const pending = await getReportPage('approvals', { rowStatus: 'Pending review', pageSize: 100 })
    expect(pending.total).toBe(counts.pendingApprovals)

    const waitlist = await getReportPage('waitlist', { pageSize: 100 })
    expect(new Set(waitlist.items.map((r) => r.learnerId)).size).toBe(counts.waitlistedLearners)
    expect(waitlist.total).toBeGreaterThan(0)

    const locked = await getReportPage('account-status', { rowStatus: 'Locked', pageSize: 100 })
    expect(locked.total).toBe(counts.lockedAccounts)

    const card = await getCrmCard()
    const queued = await getReportPage('crm-sync', { rowStatus: 'Queued', pageSize: 100 })
    const failed = await getReportPage('crm-sync', { rowStatus: 'Failed', pageSize: 100 })
    const conflict = await getReportPage('crm-sync', { rowStatus: 'Conflict', pageSize: 100 })
    expect(queued.total).toBe(card.pending)
    expect(failed.total + conflict.total).toBe(card.failed)
  })

  test('the original learner and enrolment totals are unchanged', async () => {
    actAs(db, ADMIN)
    expect((await getReportPage('learners')).total).toBe(1260)
  })

  test('approval status, external review, content and CPD filters work', async () => {
    actAs(db, ADMIN)
    expect((await getReportPage('approvals', { rowStatus: 'Rejected' })).total).toBe(1)
    const external = await getReportPage('external-review')
    expect(external.total).toBe(db.externalCertificates.length)
    expect((await getReportPage('external-review', { rowStatus: 'Verified' })).total).toBe(
      db.externalCertificates.filter((c) => c.status === 'verified').length,
    )
    const arabic = await getReportPage('content', { rowStatus: 'Arabic' })
    expect(arabic.total).toBe(
      db.contentPackages.filter((p) => p.packageId && p.language === 'ar').length,
    )
    expect(arabic.total).toBeGreaterThan(0)
    const cpd = await getReportPage('cpd', { search: 'LRN-0042' })
    expect(cpd.items[0]).toMatchObject({ earned: 6, pending: 1.5, target: 8 })
  })

  test('certification adds validity and renewal filters, and Programme B stays out', async () => {
    actAs(db, ADMIN)
    const all = await getReportPage('certification', { pageSize: 100 })
    expect(all.total).toBe(124)
    const soon = await getReportPage('certification', { rowStatus: 'Expiring soon' })
    expect(soon.items.some((r) => r.code === 'QTA-DEMO-A-P25-0001')).toBe(true)
    expect(soon.items.find((r) => r.code === 'QTA-DEMO-A-P25-0001')?.renewal).toBe('Renewal due')
    expect((await getReportPage('certification', { rowStatus: 'Expired' })).total).toBeGreaterThan(
      0,
    )
    expect((await getReportPage('certification', { rowStatus: 'Revoked' })).total).toBeGreaterThan(
      0,
    )
    expect(
      (await getReportPage('certification', { rowStatus: 'Superseded' })).total,
    ).toBeGreaterThan(0)
    expect((await getReportPage('certification', { programme: 'B' })).total).toBe(0)
  })

  test('assessment results gain an attempt-limit status and attempts carry a language', async () => {
    actAs(db, ADMIN)
    const results = await getReportPage('assessment-results', {
      rowStatus: 'Attempt limit reached',
    })
    expect(results.total).toBe(0)
    const attempts = await getReportPage('assessments', { search: 'English', pageSize: 25 })
    expect(attempts.total).toBeGreaterThan(0)
  })
})

describe('AI Analytics 29 Oct prompts', () => {
  const ask_ = async (q: string) => {
    actAs(db, ADMIN)
    return ask({ question: q })
  }

  test('the four prompts are suggested verbatim after the original seven', async () => {
    expect(SUGGESTED_PROMPTS).toHaveLength(11)
    expect(SUGGESTED_PROMPTS.slice(7)).toEqual([
      'Which learners have certificates expiring in the next 30 days?',
      'How many learners are waiting for Program A sessions?',
      'Show assessment pass rates by programme and language',
      'Which CRM events failed?',
    ])
    actAs(db, ADMIN)
    expect((await listPrompts()).prompts).toHaveLength(11)
    expect(match(SUGGESTED_PROMPTS[7]).kind).toBe('intent')
    expect(match(SUGGESTED_PROMPTS[8])).toMatchObject({ intent: 'program_a_waitlist' })
    expect(match(SUGGESTED_PROMPTS[9])).toMatchObject({ intent: 'assessment_pass_rates' })
    expect(match(SUGGESTED_PROMPTS[10])).toMatchObject({ intent: 'crm_failed_events' })
    expect(match('How many learners are in each programme?')).toMatchObject({
      intent: 'programme_distribution',
    })
  })

  test('certificates expiring in 30 days are answered from the seeded credentials', async () => {
    const a = await ask_(SUGGESTED_PROMPTS[7])
    expect(a.kind).toBe('answer')
    expect(a.table?.rows.map((r) => r.credential)).toContain('QTA-DEMO-A-P25-0001')
    expect(a.chart?.type).toBe('column')
    expect(a.filters.map((f) => f.label)).toContain('Window')
    expect(a.records?.report).toBe('certification')
  })

  test('waiting learners match the waitlist report', async () => {
    const a = await ask_(SUGGESTED_PROMPTS[8])
    const report = await getReportPage('waitlist', { pageSize: 100 })
    expect(a.sampleSize?.value).toBe(new Set(report.items.map((r) => r.learnerId)).size)
    expect(a.table?.rows).toHaveLength(report.total)
    expect(a.chart).not.toBeNull()
  })

  test('pass rates are grouped by programme and language and use the results report', async () => {
    const a = await ask_(SUGGESTED_PROMPTS[9])
    expect(a.chart?.type).toBe('grouped')
    expect(a.table?.rows).toHaveLength(4)
    expect(a.records?.report).toBe('assessment-results')
  })

  test('failed CRM events are listed with their errors', async () => {
    const a = await ask_(SUGGESTED_PROMPTS[10])
    const failedOrConflict = db.crmEvents.filter(
      (e) => e.status === 'failed' || e.status === 'conflict',
    )
    expect(a.table?.rows).toHaveLength(failedOrConflict.length)
    expect(a.table?.rows.map((r) => r.event)).toContain('EVT-0003')
    expect(a.sampleSize?.value).toBe(failedOrConflict.length)
  })

  test('with no data each answer says so and invents nothing', async () => {
    for (const c of db.certificates) c.expiresAt = '2099-01-01T00:00:00.000Z'
    for (const r of db.rsvps)
      if (r.status === 'waitlisted' || r.status === 'offered') r.status = 'cancelled'
    for (const e of db.crmEvents) e.status = 'processed'
    db.assessmentAttempts.length = 0

    const expiring = await ask_(SUGGESTED_PROMPTS[7])
    expect(expiring.prose).toContain('No learner has a current certificate expiring')
    expect(expiring.table?.rows).toHaveLength(0)
    expect(expiring.chart).toBeNull()

    const waiting = await ask_(SUGGESTED_PROMPTS[8])
    expect(waiting.prose).toContain('No learner is waiting')
    expect(waiting.sampleSize?.value).toBe(0)

    const rates = await ask_(SUGGESTED_PROMPTS[9])
    expect(rates.prose).toContain('no pass rate to report')
    expect(rates.chart).toBeNull()
    expect(rates.table?.rows.every((r) => r.rate === 'No attempts')).toBe(true)

    const failed = await ask_(SUGGESTED_PROMPTS[10])
    expect(failed.prose).toContain('No simulated CRM event has failed')
    expect(failed.table?.rows).toHaveLength(0)
  })
})
