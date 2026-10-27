import '../../__tests__/helpers/env'

import {
  afterEach,
  beforeAll,
  describe,
  expect,
  mock,
  setDefaultTimeout,
  spyOn,
  test,
} from 'bun:test'
import { app } from '@server/app'
import { auth } from '@server/auth/auth'
import { db } from '@server/db/connection'
import {
  attendance,
  auditEvents,
  certificates,
  enrolments,
  programmes,
  reviews,
  rolePlayAttempts,
  rsvps,
  sessionScores,
  sessions,
  submissions,
} from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { findEnrolment, loadEvidence } from '@server/modules/progress/progress.evidence'
import { evaluate } from '@server/modules/progress/progress.rules'
import { recomputeEnrolment } from '@server/modules/progress/progress.service'
import type { Role } from '@shared/roles'
import { and, eq } from 'drizzle-orm'
import { CLIENT_ORIGIN, HAS_TEST_DB } from '../../__tests__/helpers/env'

setDefaultTimeout(180_000)

const MAHA = 'user-l0001'
const OMAR = 'user-l0002'
const LEILA = 'user-l0003'
const SARA = 'user-l0005'

/** Signs the request in as a specific seeded user. */
function as(id: string, role: Role = 'learner') {
  spyOn(auth.api, 'getSession').mockResolvedValue({
    user: {
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: true,
      image: null,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: `session-${id}`,
      userId: id,
      token: 't',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
  } as never)
}

const json = (method: string, body?: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

async function call<T = Record<string, unknown>>(path: string, init?: RequestInit) {
  const res = await app.request(path, init)
  return { status: res.status, body: (await res.json()) as T }
}

const describeDb = HAS_TEST_DB ? describe : describe.skip

beforeAll(async () => {
  if (HAS_TEST_DB) await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

describeDb('seeded statuses agree with the programme rules', () => {
  test('every seeded enrolment evaluates to its stored status', async () => {
    const rows = await db
      .select({
        learnerId: enrolments.learnerId,
        programme: programmes.code,
        status: enrolments.status,
      })
      .from(enrolments)
      .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    const mismatches: string[] = []
    for (const row of rows) {
      const enrolment = await findEnrolment(db, row.learnerId, row.programme)
      if (!enrolment) continue
      const result = evaluate(await loadEvidence(db, enrolment))
      if (result.status !== row.status) {
        mismatches.push(`${row.learnerId}:${row.programme} ${row.status} -> ${result.status}`)
      }
    }
    expect(mismatches).toEqual([])
  })
})

describeDb('permissions', () => {
  test('journey needs a learner session', async () => {
    expect((await app.request('/api/progress/B/journey')).status).toBe(401)
    as('user-t01', 'trainer')
    expect((await app.request('/api/progress/B/journey')).status).toBe(403)
  })

  test('a learner without the enrolment gets 404, not someone else’s data', async () => {
    as(MAHA)
    expect((await app.request('/api/progress/A/journey')).status).toBe(404)
  })

  test('another learner’s attempt is not found', async () => {
    as(SARA)
    const history = await call<{ items: { id: string }[] }>('/api/progress/B/history')
    const saraAttempt = history.body.items[0]?.id as string
    mock.restore()
    as(MAHA)
    expect((await app.request(`/api/assessments/attempts/${saraAttempt}/result`)).status).toBe(404)
  })

  test('certificate verification is public; detail and PDF are owner or admin', async () => {
    const [cert] = await db
      .select({ code: certificates.code, learnerId: certificates.learnerId })
      .from(certificates)
      .limit(1)
    const code = cert?.code as string
    const verify = await call<{ found: boolean; status: string }>(
      `/api/certificates/verify/${code}`,
    )
    expect(verify.status).toBe(200)
    expect(verify.body.found).toBe(true)

    as(MAHA)
    expect((await app.request(`/api/certificates/${code}`)).status).toBe(404)
    mock.restore()
    as(cert?.learnerId as string)
    const pdf = await app.request(`/api/certificates/${code}/pdf`)
    expect(pdf.status).toBe(200)
    expect(pdf.headers.get('content-type')).toBe('application/pdf')
    const bytes = new Uint8Array(await pdf.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })
})

describeDb('AI path generator (brief §9)', () => {
  test('is deterministic and matches the brief for Maha', async () => {
    as(MAHA)
    const first = await call<{
      rationale: string
      extras: { courseCode: string }[]
      path: { code: string }
      rule: { code: string }
    }>('/api/ai-path/B')
    const second = await call('/api/ai-path/B')
    expect(first.status).toBe(200)
    expect(second.body).toEqual(first.body)
    expect(first.body.path.code).toBe('B-HOTEL')
    expect(first.body.rule.code).toBe('RULE-B-HOTEL')
    expect(first.body.extras.map((e) => e.courseCode)).toEqual(['C04'])
    expect(first.body.rationale).toBe(
      'Your visitor communication skills are strong. We recommend starting with Understanding visitor needs and Recovering a difficult service moment because these were your lowest baseline areas. Your guest-services role also benefits from Clear and inclusive communication.',
    )
  })

  test('accepting records the path version and the reason, and keeps the version', async () => {
    const before = await findEnrolment(db, MAHA, 'B')
    as(MAHA)
    const res = await call<{ assignmentReason: string }>('/api/ai-path/B/accept', json('POST'))
    expect(res.status).toBe(200)
    expect(res.body.assignmentReason).toContain('AI recommendation accepted')
    expect(res.body.assignmentReason).toContain('C04')
    const after = await findEnrolment(db, MAHA, 'B')
    expect(after?.pathVersionId).toBe(before?.pathVersionId as string)
    const [event] = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, 'path.accept'), eq(auditEvents.actorId, MAHA)))
    expect(event).toBeDefined()
  })
})

describeDb('SCORM 2004 sample package (brief §8)', () => {
  const commit = (body: Record<string, unknown>) =>
    call<{ completedNow: boolean; unitStatus: string }>(
      '/api/scorm/C04/commit',
      json('POST', { programme: 'B', launchId: 'launch-0001', ...body }),
    )

  test('resume data persists, and a pass updates progress exactly once', async () => {
    as(LEILA)
    const first = await commit({
      cmiCompletionStatus: 'incomplete',
      location: 'scene-3',
      suspendData: '{"v":1,"scene":"scene-3"}',
      sessionTimeSeconds: 120,
    })
    expect(first.status).toBe(200)
    expect(first.body.completedNow).toBe(false)

    const state = await call<{ cmi: { entry: string; location: string; suspendData: string } }>(
      '/api/scorm/C04/state?programme=B',
    )
    expect(state.body.cmi.entry).toBe('resume')
    expect(state.body.cmi.location).toBe('scene-3')

    const pass = await commit({
      cmiCompletionStatus: 'completed',
      cmiSuccessStatus: 'passed',
      scoreRaw: 80,
      location: 'scene-6',
      sessionTimeSeconds: 400,
    })
    expect(pass.body.completedNow).toBe(true)
    expect(pass.body.unitStatus).toBe('completed')

    const again = await commit({
      cmiCompletionStatus: 'completed',
      cmiSuccessStatus: 'passed',
      scoreRaw: 100,
      location: 'scene-6',
      sessionTimeSeconds: 420,
      launchId: 'launch-0002',
    })
    expect(again.body.completedNow).toBe(false)
    expect(again.body.unitStatus).toBe('completed')
  })

  test('a failed quiz never completes the unit', async () => {
    as(MAHA)
    const res = await call<{ completedNow: boolean; unitStatus: string }>(
      '/api/scorm/C04/commit',
      json('POST', {
        programme: 'B',
        launchId: 'launch-maha-1',
        cmiCompletionStatus: 'completed',
        cmiSuccessStatus: 'failed',
        scoreRaw: 60,
        location: 'scene-6',
      }),
    )
    expect(res.status).toBe(200)
    expect(res.body.unitStatus).toBe('in_progress')
  })
})

describeDb('assessments (brief §8)', () => {
  test('Maha cannot retake her baseline', async () => {
    as(MAHA)
    const res = await app.request('/api/assessments/B/pre/start', json('POST'))
    expect(res.status).toBe(400)
  })

  test('save, resume and submit with matched baseline vs post gain', async () => {
    // Open the post-assessment for Maha: one role-play attempt (the practice module's write).
    const enrolment = await findEnrolment(db, MAHA, 'B')
    await db.insert(rolePlayAttempts).values({
      enrolmentId: enrolment?.id as string,
      learnerId: MAHA,
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
      completedAt: new Date(),
    })
    await recomputeEnrolment(MAHA, 'B')

    as(MAHA)
    const started = await call<{ attemptId: string }>('/api/assessments/B/post/start', json('POST'))
    expect(started.status).toBe(200)
    const attemptId = started.body.attemptId

    // Four correct and one wrong = 80. Save two, "close", then resume.
    const answers = [
      ['discover_needs', 'B'],
      ['verify_information', 'B'],
      ['communicate_clearly', 'B'],
      ['recover_service', 'B'],
      ['protect_information', 'A'],
    ] as const
    for (const [competency, option] of answers.slice(0, 2)) {
      await call(
        `/api/assessments/attempts/${attemptId}/answer`,
        json('PATCH', { competency, option }),
      )
    }
    const resumed = await call<{
      attempt: {
        id: string
        answers: Record<string, string>
        questions: { options: { key: string }[] }[]
      }
    }>('/api/assessments/B/post')
    expect(resumed.body.attempt.id).toBe(attemptId)
    expect(Object.keys(resumed.body.attempt.answers)).toHaveLength(2)
    // No answer key reaches the browser.
    expect(JSON.stringify(resumed.body)).not.toContain('"correct"')

    const early = await app.request(`/api/assessments/attempts/${attemptId}/submit`, json('POST'))
    expect(early.status).toBe(400)

    for (const [competency, option] of answers.slice(2)) {
      await call(
        `/api/assessments/attempts/${attemptId}/answer`,
        json('PATCH', { competency, option }),
      )
    }
    const result = await call<{
      score: number
      comparison: { baseline: number; post: number; gainPoints: number }
      competencies: { key: string; points: number }[]
    }>(`/api/assessments/attempts/${attemptId}/submit`, json('POST'))
    expect(result.status).toBe(200)
    expect(result.body.score).toBe(80)
    expect(result.body.comparison).toEqual({ baseline: 40, post: 80, gainPoints: 40 })
    expect(result.body.competencies.find((c) => c.key === 'protect_information')?.points).toBe(0)
  })
})

describeDb('recomputeEnrolment', () => {
  test('Program B completes for Maha and never issues a certificate', async () => {
    const enrolment = await findEnrolment(db, MAHA, 'B')
    const [submission] = await db
      .insert(submissions)
      .values({
        assignmentId: (
          await db.query.assignments.findFirst({
            where: (a, { eq: eqFn }) => eqFn(a.code, 'B-SHORT-1'),
          })
        )?.id as string,
        enrolmentId: enrolment?.id as string,
        learnerId: MAHA,
        version: 1,
        status: 'approved',
        responseText: 'Sample',
        wordCount: 120,
        submittedAt: new Date(),
      })
      .returning({ id: submissions.id })
    await db.insert(reviews).values({
      submissionId: submission?.id as string,
      reviewerId: 'user-t06',
      rubricScore: 84,
      feedback: 'Clear acknowledgement and a useful question.',
      status: 'approved',
      reviewedAt: new Date(),
    })
    const status = await recomputeEnrolment(MAHA, 'B')
    expect(status).toBe('completed')
    expect(await recomputeEnrolment(MAHA, 'B')).toBe('completed')
    const certs = await db.select().from(certificates).where(eq(certificates.learnerId, MAHA))
    expect(certs).toHaveLength(0)
    as(MAHA)
    const mine = await call<{ items: unknown[] }>('/api/certificates/mine')
    expect(mine.body.items).toHaveLength(0)
  })

  test('Sara (B completed) has no certificate anywhere', async () => {
    expect(await recomputeEnrolment(SARA, 'B')).toBe('completed')
    const certs = await db.select().from(certificates).where(eq(certificates.learnerId, SARA))
    expect(certs).toHaveLength(0)
  })

  test('Program A certifies Omar once, with an audit record, when every condition passes', async () => {
    const enrolment = await findEnrolment(db, OMAR, 'A')
    expect(await recomputeEnrolment(OMAR, 'A')).toBe('in_progress')
    const practised = await db
      .select({ id: rolePlayAttempts.id })
      .from(rolePlayAttempts)
      .where(eq(rolePlayAttempts.enrolmentId, enrolment?.id as string))
    if (practised.length === 0) {
      await db.insert(rolePlayAttempts).values({
        enrolmentId: enrolment?.id as string,
        learnerId: OMAR,
        scenarioKey: 'changed-booking',
        mode: 'voice',
        transcript: [],
        empathyScore: 3,
        discoveryScore: 3,
        clarityScore: 3,
        accuracyScore: 3,
        solutionScore: 3,
        totalScore: 15,
        totalPercent: 75,
        feedback: { criteria: [], strength: 'Good', improve: 'Verify', retry: 'Ask' },
        completedAt: new Date(),
      })
    }

    // Attended a completed Program A session and scored 78 (the trainer workspace's writes).
    const [session] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .innerJoin(programmes, eq(programmes.id, sessions.programmeId))
      .where(and(eq(programmes.code, 'A'), eq(sessions.status, 'completed')))
      .limit(1)
    const [rsvp] = await db
      .insert(rsvps)
      .values({
        sessionId: session?.id as string,
        learnerId: OMAR,
        status: 'confirmed',
        bookedAt: new Date(),
      })
      .returning({ id: rsvps.id })
    await db.insert(attendance).values({
      rsvpId: rsvp?.id as string,
      sessionId: session?.id as string,
      learnerId: OMAR,
      status: 'attended',
    })
    await db.insert(sessionScores).values({
      rsvpId: rsvp?.id as string,
      sessionId: session?.id as string,
      learnerId: OMAR,
      preparation: 16,
      communication: 24,
      practical: 22,
      professionalism: 16,
      total: 78,
      status: 'final',
      finalisedAt: new Date(),
    })
    // C05 plan, approved assignment.
    as(OMAR)
    const c05 = await call(
      '/api/progress/resource',
      json('POST', {
        programme: 'A',
        checklist: ['acknowledge', 'discover', 'verify', 'options', 'escalate', 'followup'],
        draft: Array.from({ length: 40 }, (_, i) => `word${i}`).join(' '),
        markComplete: true,
      }),
    )
    expect(c05.status).toBe(200)
    mock.restore()
    const assignment = await db.query.assignments.findFirst({
      where: (a, { eq: eqFn }) => eqFn(a.code, 'A-ASSIGN-1'),
    })
    const [submission] = await db
      .insert(submissions)
      .values({
        assignmentId: assignment?.id as string,
        enrolmentId: enrolment?.id as string,
        learnerId: OMAR,
        version: 1,
        status: 'approved',
        responseText: 'Plan',
        wordCount: 350,
        submittedAt: new Date(),
      })
      .returning({ id: submissions.id })
    await db.insert(reviews).values({
      submissionId: submission?.id as string,
      reviewerId: 'user-t10',
      rubricScore: 82,
      feedback: 'Good plan.',
      status: 'approved',
      reviewedAt: new Date(),
    })
    // Not yet: the final assessment is still missing.
    expect(await recomputeEnrolment(OMAR, 'A')).toBe('in_progress')
    expect(
      await db.select().from(certificates).where(eq(certificates.learnerId, OMAR)),
    ).toHaveLength(0)

    // Final assessment at 80.
    as(OMAR)
    const started = await call<{ attemptId: string }>('/api/assessments/A/post/start', json('POST'))
    expect(started.status).toBe(200)
    const options: Record<string, string> = {
      discover_needs: 'B',
      verify_information: 'B',
      communicate_clearly: 'B',
      recover_service: 'B',
      protect_information: 'C',
    }
    for (const [competency, option] of Object.entries(options)) {
      await call(
        `/api/assessments/attempts/${started.body.attemptId}/answer`,
        json('PATCH', { competency, option }),
      )
    }
    const result = await call<{ score: number; passed: boolean }>(
      `/api/assessments/attempts/${started.body.attemptId}/submit`,
      json('POST'),
    )
    expect(result.body.score).toBe(80)
    expect(result.body.passed).toBe(true)

    const certs = await db.select().from(certificates).where(eq(certificates.learnerId, OMAR))
    expect(certs).toHaveLength(1)
    expect(certs[0]?.code).toMatch(/^QTA-DEMO-A-\d{6}$/)
    // Idempotent: a second recompute issues nothing new.
    expect(await recomputeEnrolment(OMAR, 'A')).toBe('completed')
    expect(
      await db.select().from(certificates).where(eq(certificates.learnerId, OMAR)),
    ).toHaveLength(1)
    const audits = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, 'certificate.issue'),
          eq(auditEvents.objectId, certs[0]?.code as string),
        ),
      )
    expect(audits).toHaveLength(1)
  })
})
