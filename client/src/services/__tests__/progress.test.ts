import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import { insertRow, nowIso } from '../api'
import { findEnrolment, loadEvidence } from '../progress/evidence'
import { evaluate } from '../progress/rules'
import { getJourney, recomputeEnrolment, saveResource } from '../progress.service'
import { actAs, freshDemo } from './helpers'

const OMAR = 'user-l0002'
const MAHA = 'user-l0001'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

describe('seeded statuses agree with the programme rules', () => {
  test('every seeded enrolment evaluates to its stored status', () => {
    const codes = new Map(db.programmes.map((p) => [p.id, p.code]))
    const mismatches: string[] = []
    for (const row of db.enrolments) {
      const code = codes.get(row.programmeId)
      const enrolment = code ? findEnrolment(row.learnerId, code) : null
      if (!enrolment) continue
      const result = evaluate(loadEvidence(enrolment))
      if (result.status !== row.status) {
        mismatches.push(`${row.learnerId}:${code} ${row.status} -> ${result.status}`)
      }
    }
    expect(mismatches).toEqual([])
  })

  test('recomputing an untouched enrolment changes nothing', () => {
    const before = structuredClone(db.enrolments.filter((e) => e.learnerId === MAHA))
    expect(recomputeEnrolment(MAHA, 'B')).toBe('in_progress')
    expect(db.enrolments.filter((e) => e.learnerId === MAHA)).toEqual(before)
    expect(recomputeEnrolment(MAHA, 'A')).toBeNull()
  })
})

describe('journey access', () => {
  test('needs a signed-in learner', async () => {
    actAs(db, null)
    await expect(getJourney('B')).rejects.toMatchObject({ status: 401 })
    actAs(db, 'user-admin')
    await expect(getJourney('B')).rejects.toMatchObject({ status: 403 })
  })

  test('a learner without the enrolment gets 404, and their own journey otherwise', async () => {
    actAs(db, MAHA)
    await expect(getJourney('A')).rejects.toMatchObject({ status: 404 })
    const journey = await getJourney('B')
    expect(journey.learner.learnerCode).toBe('L0001')
    expect(journey.enrolment.status).toBe('in_progress')
    expect(journey.assessments.baseline?.score).toBe(40)
  })
})

describe('Program A certification gate', () => {
  test('certifies Omar once, with an audit record, only when every condition passes', async () => {
    const enrolment = findEnrolment(OMAR, 'A')
    if (!enrolment) throw new Error('Omar has no A enrolment')
    expect(recomputeEnrolment(OMAR, 'A')).toBe('in_progress')
    const certificatesBefore = db.certificates.length

    // Practice, then an attended Program A session scored 78 (the trainer workspace's writes).
    if (!db.rolePlayAttempts.some((r) => r.enrolmentId === enrolment.id)) {
      insertRow('rolePlayAttempts', {
        enrolmentId: enrolment.id,
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
        completedAt: nowIso(),
      })
    }
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

    // The C05 plan through the service, then an approved assignment.
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

    // Not yet: the final assessment is still missing.
    expect(recomputeEnrolment(OMAR, 'A')).toBe('in_progress')
    expect(db.certificates.filter((c) => c.learnerId === OMAR)).toHaveLength(0)

    // Final assessment at 80.
    const post = db.assessments.find((a) => a.kind === 'post')
    if (!post) throw new Error('No post-assessment')
    insertRow('assessmentAttempts', {
      assessmentId: post.id,
      enrolmentId: enrolment.id,
      learnerId: OMAR,
      status: 'submitted',
      score: 80,
      startedAt: nowIso(),
      submittedAt: nowIso(),
    })
    expect(recomputeEnrolment(OMAR, 'A')).toBe('completed')

    const certs = db.certificates.filter((c) => c.learnerId === OMAR)
    expect(certs).toHaveLength(1)
    expect(db.certificates).toHaveLength(certificatesBefore + 1)
    expect(certs[0]?.code).toBe('QTA-DEMO-A-000121')
    // Idempotent: a second recompute issues nothing new.
    expect(recomputeEnrolment(OMAR, 'A')).toBe('completed')
    expect(db.certificates.filter((c) => c.learnerId === OMAR)).toHaveLength(1)
    const audits = db.auditEvents.filter(
      (e) => e.action === 'certificate.issue' && e.objectId === certs[0]?.code,
    )
    expect(audits).toHaveLength(1)
    expect(audits[0]?.actorRole).toBe('system')
  })

  test('Sara (B completed) never gets a certificate', () => {
    expect(recomputeEnrolment('user-l0005', 'B')).toBe('completed')
    expect(db.certificates.filter((c) => c.learnerId === 'user-l0005')).toHaveLength(0)
  })
})
