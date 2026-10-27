import '../../__tests__/helpers/env'

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  mock,
  setDefaultTimeout,
  test,
} from 'bun:test'
import { rm } from 'node:fs/promises'
import { app } from '@server/app'
import { db } from '@server/db/connection'
import { auditEvents, notifications, reviews, submissions } from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { and, eq } from 'drizzle-orm'
import { HAS_TEST_DB } from '../../__tests__/helpers/env'
import { UPLOAD_ROOT } from './assignments.storage'
import { json, ORIGIN, signInAs } from './assignments.test-helpers'

setDefaultTimeout(180_000)

afterEach(() => mock.restore())

beforeAll(async () => {
  if (HAS_TEST_DB) await reseed({ referenceDate: '2026-10-27' })
})

afterAll(async () => {
  // Test uploads live in their own folder (uploads/.test), never the demo's.
  await rm(UPLOAD_ROOT, { recursive: true, force: true })
})

type MineItem = {
  assignment: { id: string; code: string }
  enrolment: { id: string }
  state: string
  canSubmit: boolean
  versions: { id: string; version: number; status: string; review: { score: number } | null }[]
}

async function mine(userId: string) {
  signInAs(userId, 'learner')
  const res = await app.request('/api/assignments/mine')
  expect(res.status).toBe(200)
  return ((await res.json()) as { items: MineItem[] }).items
}

const words = (n: number) =>
  Array.from({ length: n }, (_, i) => (i % 12 === 11 ? 'visitor.' : 'helpful')).join(' ')

const RUBRIC_PASS = { discovery: 20, options: 20, escalation: 18, followup: 20 }

async function uploadFile(name: string, type: string, bytes: Uint8Array, assignmentId: string) {
  const start = await app.request(
    '/api/assignments/uploads',
    json({ assignmentId, fileName: name, mimeType: type, sizeBytes: bytes.byteLength }),
  )
  if (start.status !== 201) return { start }
  const { uploadId } = (await start.json()) as { uploadId: string }
  const chunk = await app.request(`/api/assignments/uploads/${uploadId}/chunks?offset=0`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', Origin: ORIGIN },
    body: bytes as unknown as BodyInit,
  })
  return { start, chunk, uploadId }
}

describe.skipIf(!HAS_TEST_DB)('learner assignments', () => {
  test("Daniel sees his returned assignment with the trainer's feedback", async () => {
    const [practical] = (await mine('user-l0004')).filter((i) => i.assignment.code === 'A-ASSIGN-1')
    expect(practical?.state).toBe('returned')
    expect(practical?.canSubmit).toBe(true)
    expect(practical?.versions[0]?.review?.score).toBe(62)
  })

  test('word count is enforced for a written response', async () => {
    const [b] = await mine('user-l0001')
    const res = await app.request(
      `/api/assignments/${b?.assignment.id}/submissions`,
      json({ enrolmentId: b?.enrolment.id, responseText: words(40) }),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('WORD_COUNT')
  })

  test('resubmitting adds a version and keeps the earlier one (version history)', async () => {
    const [practical] = (await mine('user-l0004')).filter((i) => i.assignment.code === 'A-ASSIGN-1')
    const res = await app.request(
      `/api/assignments/${practical?.assignment.id}/submissions`,
      json({ enrolmentId: practical?.enrolment.id, responseText: words(320) }),
    )
    expect(res.status).toBe(201)
    expect(((await res.json()) as { version: number }).version).toBe(2)

    const [after] = (await mine('user-l0004')).filter((i) => i.assignment.code === 'A-ASSIGN-1')
    expect(after?.versions.map((v) => [v.version, v.status])).toEqual([
      [2, 'submitted'],
      [1, 'returned'],
    ])
    expect(after?.versions[1]?.review?.score).toBe(62)
    expect(after?.state).toBe('awaiting_review')

    // A second submission while waiting is refused, not silently overwritten.
    const again = await app.request(
      `/api/assignments/${practical?.assignment.id}/submissions`,
      json({ enrolmentId: practical?.enrolment.id, responseText: words(320) }),
    )
    expect(again.status).toBe(409)
  })
})

describe.skipIf(!HAS_TEST_DB)('upload validation', () => {
  test('rejects the wrong type, an oversize file and a renamed file', async () => {
    const [practical] = (await mine('user-l0002')).filter((i) => i.assignment.code === 'A-ASSIGN-1')
    const id = practical?.assignment.id as string

    const exe = await app.request(
      '/api/assignments/uploads',
      json({
        assignmentId: id,
        fileName: 'plan.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 10,
      }),
    )
    expect(exe.status).toBe(400)

    const big = await app.request(
      '/api/assignments/uploads',
      json({
        assignmentId: id,
        fileName: 'plan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 11 * 1024 * 1024,
      }),
    )
    expect(big.status).toBe(400)
    expect(JSON.stringify(await big.json())).toContain('up to 10 MB')

    const fake = await uploadFile(
      'plan.pdf',
      'application/pdf',
      new TextEncoder().encode('MZ not a pdf'),
      id,
    )
    expect(fake.chunk?.status).toBe(400)
  })

  test('B short response takes no uploads', async () => {
    const [b] = await mine('user-l0001')
    const res = await uploadFile(
      'plan.pdf',
      'application/pdf',
      new TextEncoder().encode('%PDF-1.4 demo'),
      b?.assignment.id as string,
    )
    expect(res.start.status).toBe(400)
  })

  test('a valid PDF uploads, submits and downloads only for permitted viewers', async () => {
    const [practical] = (await mine('user-l0002')).filter((i) => i.assignment.code === 'A-ASSIGN-1')
    const bytes = new TextEncoder().encode('%PDF-1.4\n% Omar response plan (fictional)\n%%EOF')
    const up = await uploadFile(
      'Omar plan.pdf',
      'application/pdf',
      bytes,
      practical?.assignment.id as string,
    )
    expect(up.chunk?.status).toBe(200)

    const submit = await app.request(
      `/api/assignments/${practical?.assignment.id}/submissions`,
      json({ enrolmentId: practical?.enrolment.id, uploadId: up.uploadId }),
    )
    expect(submit.status).toBe(201)
    const { id } = (await submit.json()) as { id: string }

    const own = await app.request(`/api/assignments/submissions/${id}/file`)
    expect(own.status).toBe(200)
    expect(new Uint8Array(await own.arrayBuffer())).toEqual(bytes)

    signInAs('user-l0001', 'learner')
    expect((await app.request(`/api/assignments/submissions/${id}/file`)).status).toBe(404)

    const [row] = await db.select().from(submissions).where(eq(submissions.id, id))
    expect(row?.markerTrainerId).toBeTruthy()
  })
})

async function danielV1() {
  const [row] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.learnerId, 'user-l0004'), eq(submissions.version, 1)))
  return row?.id as string
}

async function danielLatest() {
  const rows = await db
    .select({ id: submissions.id, version: submissions.version })
    .from(submissions)
    .where(eq(submissions.learnerId, 'user-l0004'))
  return rows.sort((a, b) => b.version - a.version)[0]?.id as string
}

describe.skipIf(!HAS_TEST_DB)('trainer marking scope (brief §10–11)', () => {
  test("Trainer 1 gets 403 for Trainer 4's submission at the API", async () => {
    const id = await danielV1()
    signInAs('user-t01', 'trainer')
    expect((await app.request(`/api/assignments/marking/${id}`)).status).toBe(403)
    expect(
      (
        await app.request(
          `/api/assignments/marking/${id}/draft`,
          json({ breakdown: {}, feedback: '' }),
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await app.request(
          `/api/assignments/marking/${id}/finalise`,
          json({ breakdown: RUBRIC_PASS, feedback: 'Looks good overall.', decision: 'approved' }),
        )
      ).status,
    ).toBe(403)
    expect((await app.request(`/api/assignments/submissions/${id}/file`)).status).toBe(403)
  })

  test("a trainer's queue holds only their own submissions, with no contact fields", async () => {
    signInAs('user-t04', 'trainer')
    const res = await app.request('/api/assignments/marking?status=all&pageSize=100')
    const body = (await res.json()) as {
      items: { learner: Record<string, unknown> }[]
      total: number
    }
    expect(res.status).toBe(200)
    expect(body.total).toBeGreaterThan(0)
    for (const item of body.items) {
      expect(Object.keys(item.learner).sort()).toEqual(['displayName', 'learnerCode'])
    }
  })

  test('learners cannot reach marking', async () => {
    signInAs('user-l0004', 'learner')
    expect((await app.request('/api/assignments/marking')).status).toBe(403)
  })
})

describe.skipIf(!HAS_TEST_DB)('marking, notifications and corrections', () => {
  test('approving below the pass mark is refused', async () => {
    const id = await danielLatest()
    signInAs('user-t04', 'trainer')
    const res = await app.request(
      `/api/assignments/marking/${id}/finalise`,
      json({
        breakdown: { discovery: 10, options: 10, escalation: 10, followup: 10 },
        feedback: 'Some good points here.',
        decision: 'approved',
      }),
    )
    expect(res.status).toBe(400)
  })

  test('a draft is audited and kept off the learner view', async () => {
    const id = await danielLatest()
    signInAs('user-t04', 'trainer')
    const res = await app.request(
      `/api/assignments/marking/${id}/draft`,
      json({ breakdown: { discovery: 20 }, feedback: 'Draft note' }),
    )
    expect(res.status).toBe(200)
    const detail = (await (await app.request(`/api/assignments/marking/${id}`)).json()) as {
      draft: { breakdown: Record<string, number> }
    }
    expect(detail.draft.breakdown.discovery).toBe(20)
    const learnerView = JSON.stringify(await mine('user-l0004'))
    expect(learnerView).not.toContain('Draft note')
  })

  test('approving notifies the learner once, even when retried', async () => {
    const id = await danielLatest()
    signInAs('user-t04', 'trainer')
    const body = {
      breakdown: RUBRIC_PASS,
      feedback: 'Clear escalation path and a warm follow-up message. Well done.',
      decision: 'approved',
    }
    const first = await app.request(`/api/assignments/marking/${id}/finalise`, json(body))
    expect(first.status).toBe(200)
    const retry = await app.request(`/api/assignments/marking/${id}/finalise`, json(body))
    expect(retry.status).toBe(200)
    expect(((await retry.json()) as { unchanged: boolean }).unchanged).toBe(true)

    const sent = await db
      .select()
      .from(notifications)
      .where(eq(notifications.eventId, `evt-review-${id}`))
    expect(sent.map((n) => n.channel).sort()).toEqual(['email', 'in_app'])
    expect(sent.find((n) => n.channel === 'email')?.state).toBe('simulated')

    const [practical] = (await mine('user-l0004')).filter((i) => i.assignment.code === 'A-ASSIGN-1')
    expect(practical?.state).toBe('approved')
    expect(practical?.versions[0]?.review?.score).toBe(78)
  })

  test('a different final mark needs the correction route', async () => {
    const id = await danielLatest()
    signInAs('user-t04', 'trainer')
    const res = await app.request(
      `/api/assignments/marking/${id}/finalise`,
      json({
        breakdown: { ...RUBRIC_PASS, followup: 25 },
        feedback: 'Changed my mind.',
        decision: 'approved',
      }),
    )
    expect(res.status).toBe(409)
  })

  test('a correction needs a reason and writes an audit entry', async () => {
    const id = await danielLatest()
    signInAs('user-t04', 'trainer')
    const corrected = {
      breakdown: { ...RUBRIC_PASS, followup: 24 },
      feedback: 'Clear escalation path and a warm follow-up message. Well done.',
      decision: 'approved',
    }

    const noReason = await app.request(`/api/assignments/marking/${id}/correct`, json(corrected))
    expect(noReason.status).toBe(400)

    const ok = await app.request(
      `/api/assignments/marking/${id}/correct`,
      json({ ...corrected, reason: 'Follow-up section was under-marked on first review.' }),
    )
    expect(ok.status).toBe(200)

    const [review] = await db.select().from(reviews).where(eq(reviews.submissionId, id))
    expect(review?.rubricScore).toBe(82)
    const trail = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.objectId, id), eq(auditEvents.action, 'marking.correct')))
    expect(trail).toHaveLength(1)
    expect(trail[0]?.reason).toContain('under-marked')
    expect(trail[0]?.before).toEqual({ status: 'approved', score: 78 })
    expect(trail[0]?.after).toEqual({ status: 'approved', score: 82 })
    expect(trail[0]?.actorRole).toBe('trainer')

    // Retrying the same correction changes nothing and audits nothing new.
    const retry = await app.request(
      `/api/assignments/marking/${id}/correct`,
      json({ ...corrected, reason: 'Follow-up section was under-marked on first review.' }),
    )
    expect(((await retry.json()) as { unchanged: boolean }).unchanged).toBe(true)
  })
})
