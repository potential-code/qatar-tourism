import { beforeEach, describe, expect, test } from 'bun:test'
import { uploadKindOf, uploadProblem } from '@shared/schemas/assignment-marking'
import type { DemoDb } from '@/mocks/db'
import { matchesMagic, safeFileName, storedFile } from '../assignments/storage'
import { correct, finalise, getDetail, getQueue, saveDraft } from '../assignments.marking.service'
import { getSubmissionFile, listMine, submit, uploadFile } from '../assignments.service'
import { recomputeEnrolment } from '../progress.service'
import { actAs, freshDemo } from './helpers'

const MAHA = 'user-l0001'
const OMAR = 'user-l0002'
const DANIEL = 'user-l0004'
const TRAINER_1 = 'user-t01'
const MB = 1024 * 1024
const RUBRIC_PASS = { discovery: 20, options: 20, escalation: 18, followup: 20 }

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

const words = (n: number) =>
  Array.from({ length: n }, (_, i) => (i % 12 === 11 ? 'visitor.' : 'helpful')).join(' ')
const bytes = (text: string) => new TextEncoder().encode(text)
const pdf = (name = 'Omar plan.pdf', body = '%PDF-1.4\n% Omar response plan (fictional)\n%%EOF') =>
  new File([body], name, { type: 'application/pdf' })

async function practicalOf(userId: string) {
  actAs(db, userId)
  const item = (await listMine()).items.find((i) => i.assignment.code === 'A-ASSIGN-1')
  if (!item) throw new Error(`${userId} has no A-ASSIGN-1`)
  return item
}

/** The user id of the trainer who marks Daniel's work (seeded). */
function danielMarker(): string {
  const marker = db.submissions.find((s) => s.learnerId === DANIEL)?.markerTrainerId
  return db.trainerProfiles.find((t) => t.id === marker)?.userId as string
}

function danielLatest() {
  return db.submissions
    .filter((s) => s.learnerId === DANIEL)
    .sort((a, b) => b.version - a.version)[0]?.id as string
}

describe('upload validation (brief §6)', () => {
  test('type, extension, size and magic-byte checks', () => {
    expect(uploadProblem({ name: 'plan.pdf', type: 'application/pdf', size: 10 * MB })).toBeNull()
    expect(
      uploadProblem({ name: 'plan.pdf', type: 'application/pdf', size: 10 * MB + 1 }),
    ).toContain('up to 10 MB')
    expect(uploadProblem({ name: 'clip.mp4', type: 'video/mp4', size: 51 * MB })).toContain(
      'up to 50 MB',
    )
    expect(uploadProblem({ name: 'notes.txt', type: 'text/plain', size: 10 })).toContain(
      'PDF or DOCX',
    )
    expect(uploadKindOf('plan.mp4', 'application/pdf')).toBeNull()
    expect(matchesMagic('document', 'application/pdf', bytes('%PDF-1.7'))).toBe(true)
    expect(matchesMagic('document', 'application/pdf', bytes('MZ\x90\x00'))).toBe(false)
    expect(matchesMagic('video', 'video/mp4', bytes('\x00\x00\x00\x18ftypmp42'))).toBe(true)
  })

  test('file names cannot traverse directories, and seeded paths are not stored files', async () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd')
    expect(safeFileName('C:\\Users\\me\\plan.pdf')).toBe('plan.pdf')
    expect(await storedFile('../../package.json')).toBeNull()
  })

  test('the service rejects the wrong type, a renamed file and uploads to a text-only task', async () => {
    const practical = await practicalOf(OMAR)
    await expect(
      uploadFile(
        practical.assignment.id,
        new File(['x'], 'plan.exe', { type: 'application/x-msdownload' }),
      ),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      uploadFile(practical.assignment.id, pdf('plan.pdf', 'MZ not a pdf')),
    ).rejects.toMatchObject({ status: 400, code: 'UPLOAD_TYPE' })

    actAs(db, MAHA)
    const [b] = (await listMine()).items
    await expect(uploadFile(b?.assignment.id as string, pdf())).rejects.toMatchObject({
      status: 400,
      message: 'This assignment takes a written response only.',
    })
  })
})

describe('learner submissions', () => {
  test("Daniel sees his returned assignment with the trainer's feedback", async () => {
    const practical = await practicalOf(DANIEL)
    expect(practical.state).toBe('returned')
    expect(practical.canSubmit).toBe(true)
    expect(practical.versions[0]?.review?.score).toBe(62)
  })

  test('word count is enforced for a written response', async () => {
    actAs(db, MAHA)
    const [b] = (await listMine()).items
    await expect(
      submit(b?.assignment.id as string, { enrolmentId: b?.enrolment.id, responseText: words(40) }),
    ).rejects.toMatchObject({ status: 400, code: 'WORD_COUNT' })
  })

  test('resubmitting adds a version and keeps the earlier one; a second one while waiting is refused', async () => {
    const practical = await practicalOf(DANIEL)
    const created = await submit(practical.assignment.id, {
      enrolmentId: practical.enrolment.id,
      responseText: words(320),
    })
    expect(created.version).toBe(2)
    const after = await practicalOf(DANIEL)
    expect(after.versions.map((v) => [v.version, v.status])).toEqual([
      [2, 'submitted'],
      [1, 'returned'],
    ])
    expect(after.versions[1]?.review?.score).toBe(62)
    expect(after.state).toBe('awaiting_review')
    await expect(
      submit(practical.assignment.id, {
        enrolmentId: practical.enrolment.id,
        responseText: words(320),
      }),
    ).rejects.toMatchObject({ status: 409, code: 'AWAITING_REVIEW' })
  })

  test('a PDF uploads, submits, notifies the marker, and is readable only by permitted viewers', async () => {
    const practical = await practicalOf(OMAR)
    const file = pdf()
    const up = await uploadFile(practical.assignment.id, file)
    const created = await submit(practical.assignment.id, {
      enrolmentId: practical.enrolment.id,
      uploadId: up.uploadId,
    })
    const row = db.submissions.find((s) => s.id === created.id)
    expect(row?.markerTrainerId).toBeTruthy()
    expect(row?.fileName).toBe('Omar plan.pdf')

    const mine = await practicalOf(OMAR)
    expect(mine.versions[0]?.file).toMatchObject({ name: 'Omar plan.pdf', stored: true })
    const own = await getSubmissionFile(created.id)
    expect(new Uint8Array(await own.blob.arrayBuffer())).toEqual(
      new Uint8Array(await file.arrayBuffer()),
    )

    const markerUserId = db.trainerProfiles.find((t) => t.id === row?.markerTrainerId)
      ?.userId as string
    const sent = db.notifications.filter((n) => n.eventId === `evt-submitted-${created.id}`)
    expect(sent.map((n) => n.recipientId)).toEqual([markerUserId, markerUserId])

    actAs(db, MAHA)
    await expect(getSubmissionFile(created.id)).rejects.toMatchObject({ status: 404 })
    actAs(db, markerUserId)
    expect((await getSubmissionFile(created.id)).fileName).toBe('Omar plan.pdf')
  })

  test('a seeded file record has details only', async () => {
    const seeded = db.submissions.find((s) => s.fileName && s.learnerId === DANIEL)
    if (!seeded) return
    actAs(db, DANIEL)
    expect((await practicalOf(DANIEL)).versions.find((v) => v.id === seeded.id)?.file?.stored).toBe(
      false,
    )
    actAs(db, DANIEL)
    await expect(getSubmissionFile(seeded.id)).rejects.toMatchObject({ code: 'FILE_NOT_STORED' })
  })
})

describe('trainer marking scope (brief §10–11)', () => {
  test("Trainer 1 gets 403 for another trainer's submission", async () => {
    const id = danielLatest()
    actAs(db, TRAINER_1)
    await expect(getDetail(id)).rejects.toMatchObject({ status: 403 })
    await expect(saveDraft(id, { breakdown: {}, feedback: '' })).rejects.toMatchObject({
      status: 403,
    })
    await expect(
      finalise(id, {
        breakdown: RUBRIC_PASS,
        feedback: 'Looks good overall.',
        decision: 'approved',
      }),
    ).rejects.toMatchObject({ status: 403 })
    await expect(getSubmissionFile(id)).rejects.toMatchObject({ status: 403 })
  })

  test("a trainer's queue holds only their own submissions, with no contact fields", async () => {
    actAs(db, danielMarker())
    const queue = await getQueue({ status: 'all', pageSize: 100 })
    expect(queue.total).toBeGreaterThan(0)
    const trainer = db.trainerProfiles.find((t) => t.userId === danielMarker())
    for (const item of queue.items) {
      expect(Object.keys(item.learner).sort()).toEqual(['displayName', 'learnerCode'])
      expect(db.submissions.find((s) => s.id === item.id)?.markerTrainerId).toBe(trainer?.id)
    }
  })

  test('learners cannot reach marking, and only see their own submissions', async () => {
    actAs(db, DANIEL)
    await expect(getQueue()).rejects.toMatchObject({ status: 403 })
    const ids = (await listMine()).items.flatMap((i) => i.versions.map((v) => v.id))
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(db.submissions.find((s) => s.id === id)?.learnerId).toBe(DANIEL)
    }
  })
})

describe('marking, notifications and corrections', () => {
  async function danielResubmitted() {
    const practical = await practicalOf(DANIEL)
    const created = await submit(practical.assignment.id, {
      enrolmentId: practical.enrolment.id,
      responseText: words(320),
    })
    actAs(db, danielMarker())
    return created.id
  }

  test('approving below the pass mark is refused', async () => {
    const id = await danielResubmitted()
    await expect(
      finalise(id, {
        breakdown: { discovery: 10, options: 10, escalation: 10, followup: 10 },
        feedback: 'Some good points here.',
        decision: 'approved',
      }),
    ).rejects.toMatchObject({ status: 400, code: 'BELOW_PASS' })
  })

  test('a draft is a draft review row, audited and kept off the learner view', async () => {
    const id = await danielResubmitted()
    await saveDraft(id, { breakdown: { discovery: 20 }, feedback: 'Draft note' })
    expect((await getDetail(id)).draft?.breakdown.discovery).toBe(20)
    expect(db.reviews.find((r) => r.submissionId === id)?.status).toBe('draft')
    expect(db.submissions.find((s) => s.id === id)?.status).toBe('under_review')
    expect(db.auditEvents.some((e) => e.action === 'marking.draft' && e.objectId === id)).toBe(true)
    const queue = await getQueue({ status: 'open' })
    expect(queue.items.find((i) => i.id === id)?.hasDraft).toBe(true)
    const learner = await practicalOf(DANIEL)
    expect(JSON.stringify(learner)).not.toContain('Draft note')
    expect(learner.versions[0]?.review).toBeNull()
  })

  test('approving recomputes progress and notifies the learner once, even when retried', async () => {
    const id = await danielResubmitted()
    const body = {
      breakdown: RUBRIC_PASS,
      feedback: 'Clear escalation path and a warm follow-up message. Well done.',
      decision: 'approved',
    }
    const practicalEnrolment = (await practicalOf(DANIEL)).enrolment.id
    actAs(db, danielMarker())
    expect(db.enrolments.find((e) => e.id === practicalEnrolment)?.status).toBe('awaiting_review')
    expect((await finalise(id, body)).unchanged).toBe(false)
    expect((await finalise(id, body)).unchanged).toBe(true)
    const sent = db.notifications.filter((n) => n.eventId === `evt-review-${id}`)
    expect(sent.map((n) => n.channel).sort()).toEqual(['email', 'in_app'])
    expect(sent.find((n) => n.channel === 'email')?.state).toBe('simulated')
    const learner = await practicalOf(DANIEL)
    expect(learner.state).toBe('approved')
    expect(learner.versions[0]?.review?.score).toBe(78)
    // Progress was re-derived from the approval: recomputing again changes nothing.
    const enrolment = db.enrolments.find((e) => e.id === learner.enrolment.id)
    expect(enrolment?.status).toBe('in_progress')
    expect(enrolment?.currentStage).toBe('Final assessment')
    const stored = structuredClone(enrolment)
    recomputeEnrolment(DANIEL, 'A')
    expect(db.enrolments.find((e) => e.id === learner.enrolment.id)).toEqual(stored)
  })

  test('a late draft save cannot overwrite a final mark, and a different final needs a correction', async () => {
    const id = await danielResubmitted()
    await saveDraft(id, { breakdown: { discovery: 5 }, feedback: 'Autosaved draft' })
    await finalise(id, {
      breakdown: { discovery: 10, options: 10, escalation: 10, followup: 10 },
      feedback: 'Please revise the options and the follow-up message.',
      decision: 'returned',
    })
    await expect(
      saveDraft(id, { breakdown: { discovery: 6 }, feedback: 'Late autosave' }),
    ).rejects.toMatchObject({ status: 409, code: 'ALREADY_FINAL' })
    const reviews = db.reviews.filter((r) => r.submissionId === id)
    expect(reviews).toHaveLength(1)
    expect(reviews[0]?.status).toBe('returned')
    expect(reviews[0]?.feedback).toBe('Please revise the options and the follow-up message.')
    await expect(
      finalise(id, {
        breakdown: RUBRIC_PASS,
        feedback: 'Changed my mind here.',
        decision: 'approved',
      }),
    ).rejects.toMatchObject({ status: 409 })
  })

  test('a correction needs a reason and writes an audit entry', async () => {
    const id = await danielResubmitted()
    await finalise(id, {
      breakdown: RUBRIC_PASS,
      feedback: 'Clear escalation path and a warm follow-up message. Well done.',
      decision: 'approved',
    })
    const corrected = {
      breakdown: { ...RUBRIC_PASS, followup: 24 },
      feedback: 'Clear escalation path and a warm follow-up message. Well done.',
      decision: 'approved',
    }
    await expect(correct(id, corrected)).rejects.toMatchObject({ status: 400 })
    const reason = 'Follow-up section was under-marked on first review.'
    expect((await correct(id, { ...corrected, reason })).unchanged).toBe(false)
    expect(db.reviews.find((r) => r.submissionId === id)?.rubricScore).toBe(82)
    const trail = db.auditEvents.filter((e) => e.objectId === id && e.action === 'marking.correct')
    expect(trail).toHaveLength(1)
    expect(trail[0]?.before).toEqual({ status: 'approved', score: 78 })
    expect(trail[0]?.after).toEqual({ status: 'approved', score: 82 })
    expect(trail[0]?.actorRole).toBe('trainer')
    expect((await correct(id, { ...corrected, reason })).unchanged).toBe(true)
    expect(db.notifications.filter((n) => n.eventId === `evt-correct-${id}-1`).length).toBe(2)
  })
})
