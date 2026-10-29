import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import * as aiPath from '../ai-path.service'
import { insertRow, nowIso } from '../api'
import * as assessments from '../assessments.service'
import * as certificates from '../certificates.service'
import * as courses from '../courses.service'
import * as enrolments from '../enrolments.service'
import { findEnrolment } from '../progress/evidence'
import { getAttemptHistory, recomputeEnrolment, saveResource } from '../progress.service'
import * as scorm from '../scorm.service'
import { actAs, freshDemo } from './helpers'

/** Ported from server/modules/progress/learning-engine.test.ts, programmes and certificates. */

const MAHA = 'user-l0001'
const OMAR = 'user-l0002'
const LEILA = 'user-l0003'
const SARA = 'user-l0005'
const ADMIN = 'user-admin'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

function addRolePlay(learnerId: string, programme: 'A' | 'B') {
  const enrolment = findEnrolment(learnerId, programme)
  if (!enrolment) throw new Error(`${learnerId} has no ${programme} enrolment`)
  insertRow('rolePlayAttempts', {
    enrolmentId: enrolment.id,
    learnerId,
    scenarioKey: 'changed-booking',
    mode: 'text',
    transcript: [],
    empathyScore: 4,
    discoveryScore: 3,
    clarityScore: 3,
    accuracyScore: 3,
    solutionScore: 3,
    totalScore: 16,
    totalPercent: 80,
    feedback: { criteria: [], strength: 'Good', improve: 'Verify', retry: 'Ask' },
    completedAt: nowIso(),
  })
}

/** Answers every question of an open attempt and submits it. */
async function answerAndSubmit(attemptId: string, options: Record<string, 'A' | 'B' | 'C'>) {
  for (const [competency, option] of Object.entries(options)) {
    await assessments.saveAnswer({
      attemptId,
      competency: competency as Parameters<typeof assessments.saveAnswer>[0]['competency'],
      option,
    })
  }
  return assessments.submit(attemptId)
}

describe('learner scope', () => {
  test('services refuse signed-out users and other roles', async () => {
    actAs(db, null)
    await expect(enrolments.listMine()).rejects.toMatchObject({ status: 401 })
    actAs(db, 'user-t01')
    await expect(assessments.overview('B')).rejects.toMatchObject({ status: 403 })
    await expect(scorm.getState('B', 'C04')).rejects.toMatchObject({ status: 403 })
    await expect(courses.getUnit('B', 'C01')).rejects.toMatchObject({ status: 403 })
    await expect(certificates.listMine()).rejects.toMatchObject({ status: 403 })
  })

  test("another learner's attempt is not found", async () => {
    actAs(db, SARA)
    const saraAttempt = (await getAttemptHistory('B')).items[0]?.id as string
    expect(saraAttempt).toBeString()
    actAs(db, MAHA)
    await expect(assessments.getResult(saraAttempt)).rejects.toMatchObject({ status: 404 })
    await expect(assessments.submit(saraAttempt)).rejects.toMatchObject({ status: 404 })
    await expect(
      assessments.saveAnswer({ attemptId: saraAttempt, competency: 'discover_needs', option: 'A' }),
    ).rejects.toMatchObject({ status: 404 })
  })

  test('certificate verification is public; detail and PDF are owner or admin', async () => {
    const cert = db.certificates[0]
    if (!cert) throw new Error('No seeded certificate')
    actAs(db, null)
    const verified = await certificates.verify(cert.code)
    expect(verified.found).toBe(true)
    expect(await certificates.verify('QTA-DEMO-A-999999')).toMatchObject({ found: false })

    actAs(db, MAHA)
    await expect(certificates.getCertificate(cert.code)).rejects.toMatchObject({ status: 404 })
    await expect(certificates.certificatePdf(cert.code)).rejects.toMatchObject({ status: 404 })
    expect((await certificates.listMine()).items).toHaveLength(0)

    actAs(db, cert.learnerId)
    const { blob, filename } = await certificates.certificatePdf(cert.code)
    expect(filename).toBe(`${cert.code}.pdf`)
    expect(blob.type).toBe('application/pdf')
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5))
    expect(head).toBe('%PDF-')

    actAs(db, ADMIN)
    expect((await certificates.getCertificate(cert.code)).code).toBe(cert.code)
  })
})

describe('joining a programme (brief §3 routing)', () => {
  test('only a learner may enrol; A keeps B and is idempotent; C refuses', async () => {
    actAs(db, null)
    await expect(enrolments.enrolInProgramme('a')).rejects.toMatchObject({ status: 401 })
    actAs(db, 'user-t01')
    await expect(enrolments.enrolInProgramme('a')).rejects.toMatchObject({ status: 403 })

    actAs(db, MAHA)
    const bBefore = findEnrolment(MAHA, 'B')?.id
    const first = await enrolments.enrolInProgramme('a')
    expect(first).toMatchObject({ programme: 'A', created: true })
    expect((await enrolments.enrolInProgramme('A')).created).toBe(false)
    expect(findEnrolment(MAHA, 'B')?.id).toBe(bBefore as string)
    await expect(enrolments.enrolInProgramme('c')).rejects.toMatchObject({
      status: 409,
      code: 'PROGRAMME_ILLUSTRATIVE',
    })
    const mine = await enrolments.listMyProgrammeEnrolments()
    expect(mine.items.map((e) => e.programme)).toEqual(['A', 'B'])
    expect(
      db.auditEvents.filter((e) => e.action === 'enrolment.create' && e.actorId === MAHA),
    ).toHaveLength(1)
  })
})

describe('AI path generator (brief §9)', () => {
  test('is deterministic and matches the brief for Maha', async () => {
    actAs(db, MAHA)
    const first = await aiPath.getRecommendation('B')
    expect(await aiPath.getRecommendation('B')).toEqual(first)
    expect(first.path?.code).toBe('B-HOTEL')
    expect(first.rule?.code).toBe('RULE-B-HOTEL')
    expect(first.extras.map((e) => e.courseCode)).toEqual(['C04'])
    expect(first.rationale).toBe(
      'Your visitor communication skills are strong. We recommend starting with Understanding visitor needs and Recovering a difficult service moment because these were your lowest baseline areas. Your guest-services role also benefits from Clear and inclusive communication.',
    )
  })

  test('accepting records the path version and the reason, and keeps the version', async () => {
    const before = findEnrolment(MAHA, 'B')
    actAs(db, MAHA)
    const res = await aiPath.acceptPath('B')
    expect(res.assignmentReason).toContain('AI recommendation accepted')
    expect(res.assignmentReason).toContain('C04')
    expect(findEnrolment(MAHA, 'B')?.pathVersionId).toBe(before?.pathVersionId as string)
    expect(db.auditEvents.some((e) => e.action === 'path.accept' && e.actorId === MAHA)).toBe(true)
  })

  test('a new learner gets a Program B path from the published rules after the baseline', async () => {
    const maha = db.profiles.find((p) => p.userId === MAHA)
    if (!maha) throw new Error('No Maha profile')
    const user = insertRow('users', {
      id: 'user-new-b',
      name: 'Hessa Al Kuwari',
      email: 'hessa.alkuwari@example.com',
      emailVerified: true,
      role: 'learner',
    })
    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = structuredClone(maha)
    insertRow('profiles', {
      ...fields,
      userId: user.id,
      learnerCode: 'L9001',
      fullName: 'Hessa Al Kuwari',
    })
    actAs(db, user.id)
    const joined = await enrolments.enrolInProgramme('B')
    expect(joined.created).toBe(true)

    await expect(aiPath.acceptPath('B')).rejects.toMatchObject({ status: 400 })
    const { attemptId } = await assessments.start('B', 'pre')
    const result = await answerAndSubmit(attemptId, {
      discover_needs: 'A',
      verify_information: 'B',
      communicate_clearly: 'B',
      recover_service: 'A',
      protect_information: 'B',
    })
    expect(result.kind).toBe('pre')

    const rec = await aiPath.getRecommendation('B')
    expect(rec.inputs.baseline).not.toBeNull()
    expect(rec.path?.code).toBe('B-HOTEL')
    expect(rec.rule?.code).toBe('RULE-B-HOTEL')
    expect(rec.required.length).toBeGreaterThan(0)
    const accepted = await aiPath.acceptPath('B')
    expect(accepted.path?.code).toBe('B-HOTEL')
  })
})

describe('SCORM 2004 sample package (brief §8)', () => {
  const commit = (body: Partial<Parameters<typeof scorm.commit>[1]>) =>
    scorm.commit('C04', {
      programme: 'B',
      launchId: 'launch-0001',
      cmiCompletionStatus: 'incomplete',
      ...body,
    })

  test('resume data persists, and a pass updates progress exactly once', async () => {
    actAs(db, LEILA)
    const first = await commit({
      location: 'scene-3',
      suspendData: '{"v":1,"scene":"scene-3"}',
      sessionTimeSeconds: 120,
    })
    expect(first.completedNow).toBe(false)

    const state = await scorm.getState('B', 'C04')
    expect(state.cmi.entry).toBe('resume')
    expect(state.cmi.location).toBe('scene-3')

    const pass = await commit({
      cmiCompletionStatus: 'completed',
      cmiSuccessStatus: 'passed',
      scoreRaw: 80,
      location: 'scene-6',
      sessionTimeSeconds: 400,
    })
    expect(pass.completedNow).toBe(true)
    expect(pass.unitStatus).toBe('completed')
    const unit = await courses.getUnit('B', 'C04')
    const completedAt = unit.progress.completedAt

    const again = await commit({
      cmiCompletionStatus: 'completed',
      cmiSuccessStatus: 'passed',
      scoreRaw: 100,
      location: 'scene-6',
      sessionTimeSeconds: 420,
      launchId: 'launch-0002',
    })
    expect(again.completedNow).toBe(false)
    expect(again.unitStatus).toBe('completed')
    expect(again.totalTimeSeconds).toBe(820)
    expect((await courses.getUnit('B', 'C04')).progress.completedAt).toBe(completedAt)

    // Restart clears the resume point but never undoes the counted pass.
    await scorm.restart('B', 'C04')
    const restarted = await scorm.getState('B', 'C04')
    expect(restarted.cmi.entry).toBe('ab-initio')
    expect(restarted.unit.status).toBe('completed')
  })

  test('a failed quiz never completes the unit', async () => {
    actAs(db, MAHA)
    const res = await commit({
      launchId: 'launch-maha-1',
      cmiCompletionStatus: 'completed',
      cmiSuccessStatus: 'failed',
      scoreRaw: 60,
      location: 'scene-6',
    })
    expect(res.unitStatus).toBe('in_progress')
  })
})

describe('assessments (brief §8)', () => {
  test('Maha cannot retake her baseline', async () => {
    actAs(db, MAHA)
    await expect(assessments.start('B', 'pre')).rejects.toMatchObject({ status: 400 })
  })

  test('save, resume and submit with matched baseline vs post gain', async () => {
    addRolePlay(MAHA, 'B')
    recomputeEnrolment(MAHA, 'B')
    actAs(db, MAHA)
    const { attemptId } = await assessments.start('B', 'post')
    await assessments.saveAnswer({ attemptId, competency: 'discover_needs', option: 'B' })
    await assessments.saveAnswer({ attemptId, competency: 'verify_information', option: 'B' })

    const resumed = await assessments.getState('B', 'post')
    expect(resumed.attempt?.id).toBe(attemptId)
    expect(Object.keys(resumed.attempt?.answers ?? {})).toHaveLength(2)
    expect(JSON.stringify(resumed)).not.toContain('"correct"')
    expect((await assessments.start('B', 'post')).resumed).toBe(true)

    await expect(assessments.submit(attemptId)).rejects.toMatchObject({ status: 400 })
    await assessments.saveAnswer({ attemptId, competency: 'communicate_clearly', option: 'B' })
    await assessments.saveAnswer({ attemptId, competency: 'recover_service', option: 'B' })
    await assessments.saveAnswer({ attemptId, competency: 'protect_information', option: 'A' })
    const result = await assessments.submit(attemptId)
    expect(result.score).toBe(80)
    expect(result.comparison).toEqual({ baseline: 40, post: 80, gainPoints: 40 })
    expect(result.competencies.find((c) => c.key === 'protect_information')?.points).toBe(0)
    await expect(assessments.submit(attemptId)).rejects.toMatchObject({ status: 400 })
  })
})

describe('Program A certificate through the services (brief §6)', () => {
  /** Every Program A gate for Omar except the final assessment (other domains' writes). */
  async function omarReadyForFinal() {
    const enrolment = findEnrolment(OMAR, 'A')
    if (!enrolment) throw new Error('Omar has no A enrolment')
    if (!db.rolePlayAttempts.some((r) => r.enrolmentId === enrolment.id)) addRolePlay(OMAR, 'A')
    const programmeA = db.programmes.find((p) => p.code === 'A')
    const session = db.sessions.find(
      (s) => s.programmeId === programmeA?.id && s.status === 'completed',
    )
    if (!session) throw new Error('No completed A session')
    const rsvp = insertRow('rsvps', {
      sessionId: session.id,
      learnerId: OMAR,
      status: 'confirmed',
      bookedAt: nowIso(),
    })
    insertRow('attendance', {
      rsvpId: rsvp.id,
      sessionId: session.id,
      learnerId: OMAR,
      status: 'attended',
    })
    insertRow('sessionScores', {
      rsvpId: rsvp.id,
      sessionId: session.id,
      learnerId: OMAR,
      preparation: 16,
      communication: 24,
      practical: 22,
      professionalism: 16,
      total: 78,
      status: 'final',
      finalisedAt: nowIso(),
    })
    actAs(db, OMAR)
    await saveResource({
      programme: 'A',
      checklist: ['acknowledge', 'discover', 'verify', 'options', 'escalate', 'followup'],
      draft: Array.from({ length: 40 }, (_, i) => `word${i}`).join(' '),
      markComplete: true,
    })
    const assignment = db.assignments.find((a) => a.code === 'A-ASSIGN-1')
    if (!assignment) throw new Error('No A assignment')
    const submission = insertRow('submissions', {
      assignmentId: assignment.id,
      enrolmentId: enrolment.id,
      learnerId: OMAR,
      status: 'approved',
      responseText: 'Plan',
      wordCount: 350,
      submittedAt: nowIso(),
    })
    insertRow('reviews', {
      submissionId: submission.id,
      reviewerId: 'user-t10',
      rubricScore: 82,
      feedback: 'Good plan.',
      status: 'approved',
      reviewedAt: nowIso(),
    })
    expect(recomputeEnrolment(OMAR, 'A')).toBe('in_progress')
  }

  const issuedCount = () => db.certificates.filter((c) => c.status === 'issued').length

  test('the final assessment pass issues exactly one certificate, QTA-DEMO-A-000121', async () => {
    expect(issuedCount()).toBe(120)
    await omarReadyForFinal()
    expect((await certificates.listMine()).items).toHaveLength(0)

    const { attemptId } = await assessments.start('A', 'post')
    const result = await answerAndSubmit(attemptId, {
      discover_needs: 'B',
      verify_information: 'B',
      communicate_clearly: 'B',
      recover_service: 'B',
      protect_information: 'C',
    })
    expect(result.score).toBe(80)
    expect(result.passed).toBe(true)

    const mine = await certificates.listMine()
    expect(mine.items.map((c) => c.code)).toEqual(['QTA-DEMO-A-000121'])
    expect(mine.items[0]?.status).toBe('issued')
    expect(issuedCount()).toBe(121)
    expect(findEnrolment(OMAR, 'A')?.status).toBe('completed')
    expect(recomputeEnrolment(OMAR, 'A')).toBe('completed')
    expect(issuedCount()).toBe(121)
    expect(
      db.auditEvents.filter(
        (e) => e.action === 'certificate.issue' && e.objectId === 'QTA-DEMO-A-000121',
      ),
    ).toHaveLength(1)
    // The final assessment cannot be retaken once passed.
    await expect(assessments.start('A', 'post')).rejects.toMatchObject({ status: 400 })
  })

  test('a revoked certificate stays revoked after recompute; only the admin reissue replaces it', async () => {
    const cert = db.certificates.find((c) => c.status === 'issued')
    if (!cert) throw new Error('No issued certificate')
    const programme = db.programmes.find((p) => p.id === cert.programmeId)?.code ?? 'A'

    actAs(db, cert.learnerId)
    await expect(
      certificates.revoke(cert.code, { reason: 'Not mine to do' }),
    ).rejects.toMatchObject({ status: 403 })

    actAs(db, ADMIN)
    await expect(certificates.reissue(cert.code, { reason: 'Too early' })).rejects.toMatchObject({
      status: 400,
    })
    await certificates.revoke(cert.code, { reason: 'Issued in error during the demo' })
    await expect(
      certificates.revoke(cert.code, { reason: 'Issued in error again' }),
    ).rejects.toMatchObject({ status: 400 })

    recomputeEnrolment(cert.learnerId, programme)
    const ofEnrolment = () => db.certificates.filter((c) => c.enrolmentId === cert.enrolmentId)
    expect(ofEnrolment().map((c) => [c.code, c.status])).toEqual([[cert.code, 'revoked']])
    expect(await certificates.verify(cert.code)).toMatchObject({ status: 'revoked' })

    const reissued = await certificates.reissue(cert.code, { reason: 'Corrected after review' })
    expect(reissued.code).toBe('QTA-DEMO-A-000121')
    recomputeEnrolment(cert.learnerId, programme)
    expect(ofEnrolment()).toHaveLength(2)
    expect(ofEnrolment().filter((c) => c.status === 'issued')).toHaveLength(1)

    const audits = db.auditEvents.filter((e) => e.objectType === 'certificate')
    expect(audits).toContainEqual(
      expect.objectContaining({
        action: 'certificate.revoke',
        objectId: cert.code,
        reason: 'Issued in error during the demo',
      }),
    )
    expect(audits).toContainEqual(
      expect.objectContaining({
        action: 'certificate.reissue',
        objectId: reissued.code,
        reason: 'Corrected after review',
      }),
    )
  })
})
