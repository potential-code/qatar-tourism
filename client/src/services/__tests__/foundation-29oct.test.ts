import { beforeEach, describe, expect, test } from 'bun:test'
import {
  credentialLifecycle,
  daysToExpiry,
  expiringSoonDays,
  supersededIds,
} from '@shared/utils/credentials'
import { accountStatusOf, crmLearnerId, learnerDisplayId } from '@shared/utils/identity'
import type { DemoDb } from '@/mocks/db'
import { TABLE_NAMES } from '@/mocks/tables'
import { now } from '../clock'
import { advanceDemoClock, getDemoClock, resetDemoClock } from '../clock.service'
import { resetDemoData } from '../demo.service'
import { getDemoSettings, updateDemoSettings } from '../demo-settings.service'
import { actAs, freshDemo } from './helpers'

/**
 * Foundation for the 29 Oct update: the new tables and their seeded states, the Mariam persona,
 * the demo clock and the configurable settings. Feature lanes extend, never loosen, these.
 */

let db: DemoDb
const ADMIN = 'user-admin'
const MARIAM = 'user-l0042'
const DAY = 86_400_000

beforeEach(() => {
  db = freshDemo()
})

const nowMs = () => now().getTime()
const lifecycle = (cert: DemoDb['certificates'][number]) =>
  credentialLifecycle(cert, nowMs(), {
    superseded: supersededIds(db.certificates),
    expiringSoonDays: expiringSoonDays(db.settings.reminderDaysBefore),
  })

describe('tables', () => {
  test('every table is a collection on the database, and the 29 Oct ones are seeded', () => {
    for (const name of TABLE_NAMES) expect(Array.isArray(db[name])).toBe(true)
    for (const name of [
      'approvalRequests',
      'questionBank',
      'assessmentRules',
      'cpdLedger',
      'externalCertificates',
      'licenceStatus',
      'xapiStatements',
      'crmMappings',
      'crmEvents',
      'integrationSettings',
    ] as const) {
      expect(db[name].length).toBeGreaterThan(0)
    }
    // Filled by the feature lanes at run time.
    expect(db.seatOffers).toEqual([])
    expect(db.attemptGrants).toEqual([])
  })
})

describe('Mariam Al Nuaimi (LRN-0042)', () => {
  const profile = () => db.profiles.filter((p) => p.userId === MARIAM)
  const code = (programmeId: string) => db.programmes.find((p) => p.id === programmeId)?.code

  test('exists exactly once with the documented identity', () => {
    expect(profile()).toHaveLength(1)
    expect(profile()[0]?.learnerCode).toBe('L0042')
    expect(learnerDisplayId('L0042')).toBe('LRN-0042')
    expect(crmLearnerId('L0042')).toBe('CRM-0042')
    expect(db.users.filter((u) => u.email === 'mariam.alnuaimi@example.com')).toHaveLength(1)
    expect(db.users.filter((u) => u.name === 'Mariam Al Nuaimi')).toHaveLength(1)
    expect(db.users.find((u) => u.id === MARIAM)?.email).toBe('mariam.alnuaimi@example.com')
  })

  test('has active A and B enrolments and a completed Program B lesson', () => {
    const own = db.enrolments.filter((e) => e.learnerId === MARIAM)
    expect(own.map((e) => code(e.programmeId)).sort()).toEqual(['A', 'B'])
    expect(own.every((e) => e.status === 'in_progress')).toBe(true)
    const b = own.find((e) => code(e.programmeId) === 'B')
    expect(db.unitProgress.some((u) => u.enrolmentId === b?.id && u.status === 'completed')).toBe(
      true,
    )
  })

  test('has a Program A assessment attempt and one upcoming confirmed session', () => {
    const a = db.enrolments.find((e) => e.learnerId === MARIAM && code(e.programmeId) === 'A')
    expect(db.assessmentAttempts.some((x) => x.enrolmentId === a?.id)).toBe(true)
    const upcoming = db.rsvps.filter(
      (r) =>
        r.learnerId === MARIAM &&
        r.status === 'confirmed' &&
        Date.parse(db.sessions.find((s) => s.id === r.sessionId)?.startsAt ?? '0') > nowMs(),
    )
    expect(upcoming).toHaveLength(1)
  })

  test('holds a prior Program A credential expiring 25 days after the reference date', () => {
    const cert = db.certificates.find((c) => c.learnerId === MARIAM)
    expect(cert?.programmeId).toBe(db.programmes.find((p) => p.code === 'A')?.id)
    expect(cert && daysToExpiry(cert.expiresAt, nowMs())).toBe(25)
    expect(cert && lifecycle(cert)).toBe('expiring_soon')
  })

  test('has a pending external certificate with its approval request, and an active licence', () => {
    const external = db.externalCertificates.filter((e) => e.learnerId === MARIAM)
    expect(external).toHaveLength(1)
    expect(external[0]?.status).toBe('pending')
    const request = db.approvalRequests.find((r) => r.externalCertificateId === external[0]?.id)
    expect(request).toMatchObject({
      type: 'external_certificate',
      status: 'pending',
      learnerId: MARIAM,
    })
    expect(db.licenceStatus.find((l) => l.learnerId === MARIAM)).toMatchObject({
      status: 'active',
      source: 'crm',
    })
    expect(db.crmMappings.find((m) => m.learnerId === MARIAM)?.externalLearnerId).toBe('CRM-0042')
  })

  test('learner totals and group counts are unchanged', () => {
    expect(db.users.filter((u) => u.role === 'learner')).toHaveLength(1200)
    expect(db.profiles).toHaveLength(1200)
    expect(db.enrolments).toHaveLength(1260)
  })
})

describe('approvals, waitlist, account status', () => {
  test('SPEC §5 counts: 3 pending + 1 rejected enrolment, 2 external-certificate requests', () => {
    const by = (type: string, status: string) =>
      db.approvalRequests.filter((r) => r.type === type && r.status === status).length
    expect(by('enrolment', 'pending')).toBe(3)
    expect(by('enrolment', 'rejected')).toBe(1)
    expect(db.approvalRequests.filter((r) => r.type === 'external_certificate')).toHaveLength(2)
    expect(new Set(db.approvalRequests.map((r) => r.code)).size).toBe(db.approvalRequests.length)
    expect(db.approvalRequests.every((r) => /^REQ-\d{4}$/.test(r.code))).toBe(true)
    const rejected = db.approvalRequests.find((r) => r.status === 'rejected')
    expect(rejected?.reason).toBeTruthy()
  })

  test('the full session has 20 confirmed seats and 3 waitlisted learners', () => {
    const full = db.sessions.find((s) => s.code === 'SES-T03-2')
    const at = (status: string) =>
      db.rsvps.filter((r) => r.sessionId === full?.id && r.status === status).length
    expect(full?.capacity).toBe(20)
    expect(at('confirmed')).toBe(20)
    expect(at('waitlisted')).toBe(3)
  })

  test('one seeded locked learner who is not a persona; no account is disabled', () => {
    const locked = db.profiles.filter((p) => accountStatusOf(p) === 'locked')
    expect(locked).toHaveLength(1)
    expect(locked[0]?.lockReason).toBeTruthy()
    expect(['L0001', 'L0002', 'L0003', 'L0004', 'L0005', 'L0042']).not.toContain(
      locked[0]?.learnerCode ?? '',
    )
    expect(db.profiles.filter((p) => accountStatusOf(p) === 'disabled')).toHaveLength(0)
  })

  test('a suspended profile reads as disabled', () => {
    expect(accountStatusOf({ accountStatus: 'active', suspended: true })).toBe('disabled')
    expect(accountStatusOf({ accountStatus: 'locked', suspended: false })).toBe('locked')
    expect(accountStatusOf({ accountStatus: 'active', suspended: false })).toBe('active')
  })
})

describe('credentials, CPD and external evidence (SPEC §7)', () => {
  test('lifecycle mix: one expiring, one expired, one superseded with its renewal, one revoked', () => {
    const states = db.certificates.map(lifecycle)
    const count = (s: string) => states.filter((x) => x === s).length
    expect(count('expiring_soon')).toBe(1)
    expect(count('expired')).toBe(1)
    expect(count('superseded')).toBe(1)
    expect(count('revoked')).toBe(1)
    expect(count('active')).toBe(120)
    const renewal = db.certificates.find((c) => c.supersedesId)
    const old = db.certificates.find((c) => c.id === renewal?.supersedesId)
    expect(old?.learnerId).toBe(renewal?.learnerId)
    expect(old?.status).toBe('issued')
  })

  test('every certificate has a validity window of 12 months and CPD hours', () => {
    for (const cert of db.certificates) {
      expect(cert.expiresAt).not.toBeNull()
      const months =
        (Date.parse(cert.expiresAt ?? '') - Date.parse(cert.issuedAt)) / ((365 * DAY) / 12)
      expect(Math.round(months)).toBe(12)
      expect(cert.cpdHours).toBeGreaterThan(0)
    }
    expect(db.settings.credentialValidityMonths).toBe(12)
  })

  test('external certificates cover pending, verified and rejected, with CPD that never double counts', () => {
    const statuses = db.externalCertificates.map((e) => e.status).sort()
    expect(statuses).toEqual(['pending', 'pending', 'rejected', 'verified'])
    const verified = db.externalCertificates.find((e) => e.status === 'verified')
    expect(verified?.recognisedAmount).toBe(3)
    expect(verified?.reviewerId).toBe(ADMIN)
    for (const external of db.externalCertificates) {
      expect(db.cpdLedger.filter((l) => l.externalCertificateId === external.id)).toHaveLength(1)
    }
    expect(
      db.cpdLedger
        .filter((l) => l.source === 'external' && l.status === 'approved')
        .reduce((sum, l) => sum + l.hours, 0),
    ).toBe(3)
  })

  test('Program B earns no CPD while the demo rule is off, and holds no certificate', () => {
    expect(db.settings.programmeBCpdEnabled).toBe(false)
    expect(db.cpdLedger.filter((l) => l.enrolmentId !== null)).toHaveLength(0)
    const bId = db.programmes.find((p) => p.code === 'B')?.id
    expect(db.certificates.filter((c) => c.programmeId === bId)).toHaveLength(0)
  })

  test('licence status is its own record, not derived from certificates', () => {
    const expired = db.licenceStatus.find((l) => l.status === 'expired')
    expect(expired).toBeDefined()
    // That learner still holds an issued, valid-by-record certificate row from the prior cycle.
    expect(db.certificates.some((c) => c.learnerId === expired?.learnerId)).toBe(true)
    expect(db.licenceStatus.filter((l) => l.pendingRequest !== null)).toHaveLength(1)
  })
})

describe('assessment rules, content and CRM seeds', () => {
  test('pre and post rules follow SPEC §6', () => {
    for (const programme of ['A', 'B'] as const) {
      const pre = db.assessmentRules.find((r) => r.kind === 'pre' && r.programme === programme)
      const post = db.assessmentRules.find((r) => r.kind === 'post' && r.programme === programme)
      expect(pre).toMatchObject({ drawCount: 5, attemptLimit: 1, passPercent: null })
      expect(post).toMatchObject({
        drawCount: 10,
        passPercent: 80,
        attemptLimit: 2,
        scorePolicy: 'best',
        timeLimitMinutes: 15,
        randomiseQuestions: true,
      })
      expect(post?.draws.reduce((sum, d) => sum + d.count, 0)).toBe(10)
    }
  })

  test('the existing ten questions are mapped into the bank', () => {
    expect(db.questionBank).toHaveLength(10)
    expect(db.questionBank.every((q) => q.status === 'published' && q.language === 'en')).toBe(true)
  })

  test('four content package variants with reserved ids and launch URLs', () => {
    const library = db.contentPackages.filter((p) => p.packageId !== null)
    expect(library.map((p) => p.packageId).sort()).toEqual([
      'pve-ar-xapi',
      'pve-en-xapi',
      'wvq-ar-scorm2004',
      'wvq-en-scorm2004',
    ])
    for (const p of library) {
      expect(p.launchUrl).toBe(`/content/${p.packageId}/index.html`)
      expect(p.isCurrent).toBe(false)
    }
    expect(new Set(library.map((p) => p.courseKey)).size).toBe(2)
    expect(db.xapiStatements.every((s) => s.simulatedLrs)).toBe(true)
  })

  test('CRM events: processed, queued, failed (QT-A unmapped) and a conflict, with unique ids', () => {
    expect(db.crmEvents.map((e) => e.status).sort()).toEqual([
      'conflict',
      'failed',
      'processed',
      'queued',
    ])
    expect(new Set(db.crmEvents.map((e) => e.eventId)).size).toBe(4)
    expect(db.crmEvents.find((e) => e.status === 'failed')?.error).toContain('QT-A')
  })

  test('data residency defaults to "To be confirmed" for all six rows', () => {
    const row = db.integrationSettings.find((s) => s.area === 'dataResidency')
    const rows = (row?.config.rows ?? []) as { status: string }[]
    expect(rows).toHaveLength(6)
    expect(rows.every((r) => r.status === 'To be confirmed')).toBe(true)
  })
})

describe('demo clock', () => {
  test('advancing moves now() by whole days and is audited; reset puts it back', async () => {
    actAs(db, ADMIN)
    const before = nowMs()
    const view = await advanceDemoClock(30)
    expect(view.offsetDays).toBe(30)
    expect(nowMs() - before).toBeGreaterThanOrEqual(30 * DAY)
    expect(nowMs() - before).toBeLessThan(30 * DAY + 5_000)
    expect(db.auditEvents.some((e) => e.action === 'demo.clock.advance')).toBe(true)

    await advanceDemoClock(5)
    expect((await getDemoClock()).offsetDays).toBe(35)

    await resetDemoClock()
    expect(db.meta.clockOffsetDays).toBe(0)
    expect(Math.abs(nowMs() - before)).toBeLessThan(5_000)
    expect(db.auditEvents.some((e) => e.action === 'demo.clock.reset')).toBe(true)
  })

  test('advancing 40 days turns the expiring credential into an expired one', async () => {
    actAs(db, ADMIN)
    const cert = db.certificates.find((c) => c.learnerId === MARIAM)
    if (!cert) throw new Error('Mariam has no credential')
    expect(lifecycle(cert)).toBe('expiring_soon')
    await advanceDemoClock(40)
    expect(lifecycle(cert)).toBe('expired')
  })

  test('only admins; days must be whole and between 1 and 730', async () => {
    actAs(db, 'user-l0001')
    await expect(advanceDemoClock(1)).rejects.toMatchObject({ status: 403 })
    actAs(db, 'user-t01')
    await expect(resetDemoClock()).rejects.toMatchObject({ status: 403 })
    actAs(db, ADMIN)
    await expect(advanceDemoClock(0)).rejects.toMatchObject({ status: 400 })
    await expect(advanceDemoClock(1.5)).rejects.toMatchObject({ status: 400 })
    await expect(advanceDemoClock(731)).rejects.toMatchObject({ status: 400 })
  })

  test('a full demo reset restores the clock offset', async () => {
    actAs(db, ADMIN)
    await advanceDemoClock(10)
    await resetDemoData()
    expect(db.meta.clockOffsetDays).toBe(0)
  })
})

describe('demo settings', () => {
  test('start at the SPEC values', async () => {
    actAs(db, 'user-l0001')
    expect(await getDemoSettings()).toEqual({
      seatOfferWindowHours: 24,
      credentialValidityMonths: 12,
      cpdTarget: 8,
      cpdUnit: 'hours',
      cpdHoursPerCredit: 1,
      reminderDaysBefore: [60, 30, 7],
      programmeBCpdEnabled: false,
      programmeBCpdPerCourse: 0.5,
    })
  })

  test('admins change them with an audit; others cannot; bad values are rejected', async () => {
    actAs(db, 'user-t01')
    await expect(updateDemoSettings({ cpdTarget: 10 })).rejects.toMatchObject({ status: 403 })
    actAs(db, ADMIN)
    const next = await updateDemoSettings({ seatOfferWindowHours: 12, reminderDaysBefore: [7, 30] })
    expect(next.seatOfferWindowHours).toBe(12)
    expect(next.reminderDaysBefore).toEqual([30, 7])
    expect(db.auditEvents.some((e) => e.action === 'settings.update')).toBe(true)
    await expect(updateDemoSettings({ seatOfferWindowHours: 0 })).rejects.toMatchObject({
      status: 400,
    })
  })
})
