import { beforeEach, describe, expect, test } from 'bun:test'
import { EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import type { DemoDb } from '@/mocks/db'
import { listAssessments, updatePassMark } from '../admin/assessments.service'
import { listCourses, updateCourse } from '../admin/courses.service'
import {
  exportAuditCsv,
  getHubOverview,
  getPermissions,
  listAudit,
  listIntegrations,
} from '../admin/governance.service'
import { getProgramme, listProgrammes, updateProgramme } from '../admin/programmes.service'
import {
  decideChangeRequest,
  getSession,
  listChangeRequests,
  listSessions,
} from '../admin/sessions.service'
import { getTrainer, listTrainers, setTrainerProgrammes } from '../admin/trainers.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
  actAs(db, 'user-admin')
})

const programmeId = (code: string) => db.programmes.find((p) => p.code === code)?.id ?? ''
const trainerId = (code: string) => db.trainerProfiles.find((t) => t.code === code)?.id ?? ''

describe('programmes', () => {
  test('counts come from the data: A 420, B 660, C 180; 120 A certificates', async () => {
    const list = await listProgrammes()
    expect(list.map((p) => [p.code, p.enrolments, p.certificates, p.canCertify])).toEqual([
      ['A', 420, 120, true],
      ['B', 660, 0, false],
      ['C', 180, 0, false],
    ])
  })

  test('detail shows the stage structure of the default path', async () => {
    const body = await getProgramme(programmeId('A'))
    expect(body.defaultPath?.code).toBe('A-PRO')
    expect(new Set(body.structure.map((s) => s.level))).toEqual(new Set([1, 2]))
  })

  for (const code of ['B', 'C'] as const) {
    test(`Program ${code}: enabling certification is refused and nothing changes`, async () => {
      await expect(
        updateProgramme(programmeId(code), { certificationEnabled: true }),
      ).rejects.toMatchObject({ status: 422, code: 'CERTIFICATION_NOT_ALLOWED' })
      expect(db.programmes.find((p) => p.code === code)?.certificationEnabled).toBe(false)
    })
  }

  test('an allowed edit is saved and audited with before/after', async () => {
    await updateProgramme(programmeId('B'), { audience: 'Anyone who welcomes visitors in Qatar.' })
    const event = db.auditEvents.find((e) => e.action === 'programme.update')
    expect(event?.objectId).toBe('B')
    expect(event?.after).toMatchObject({ audience: 'Anyone who welcomes visitors in Qatar.' })
  })
})

describe('courses and assessments', () => {
  test('lists C01 to C07 with packages', async () => {
    const { items } = await listCourses()
    expect(items.map((c) => c.code)).toEqual(['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07'])
    expect(items.find((c) => c.code === 'C04')?.packages.length).toBeGreaterThan(0)
  })

  test('editing a course is audited', async () => {
    const course = db.courses.find((c) => c.code === 'C03')
    await updateCourse(course?.id ?? '', { summary: 'A clearer summary for the demonstration.' })
    expect(course?.summary).toBe('A clearer summary for the demonstration.')
    expect(db.auditEvents.find((e) => e.action === 'course.update')?.objectId).toBe('C03')
  })

  test('lists the three assessment versions with attempt counts', async () => {
    const { items } = await listAssessments()
    expect(items.map((a) => a.code).sort()).toEqual(['FOUNDATION-V1', 'POST-V1', 'PRE-V1'])
    expect(items.find((a) => a.code === 'POST-V1')?.attempts).toBe(420)
  })

  test('a pass-mark change needs a reason and is audited; the baseline has no pass mark', async () => {
    const post = db.assessments.find((a) => a.code === 'POST-V1')
    const pre = db.assessments.find((a) => a.code === 'PRE-V1')
    await expect(
      updatePassMark(post?.id ?? '', { passPercent: 75 } as never),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      updatePassMark(pre?.id ?? '', { passPercent: 60, reason: 'Trying a pass mark' }),
    ).rejects.toMatchObject({ status: 400 })
    await updatePassMark(post?.id ?? '', { passPercent: 75, reason: 'Demo calibration' })
    const event = db.auditEvents.find((e) => e.action === 'assessment.update')
    expect(event?.before).toMatchObject({ passPercent: 80 })
  })
})

describe('trainers', () => {
  test('lists ten trainers with approved programmes', async () => {
    const { items } = await listTrainers()
    expect(items).toHaveLength(10)
    expect(items.find((t) => t.code === 'T10')?.programmes).toEqual(['A', 'B'])
  })

  test('detail shows role-based rights from the permission matrix', async () => {
    const body = await getTrainer(trainerId('T03'))
    expect(body.sessions).toHaveLength(3)
    expect(body.rights.find((r) => r.action === 'export.personal')?.access).toBe('none')
    expect(body.marksExportFields).toEqual(['learnerCode', 'score'])
  })

  test('changing approved programmes is audited as a permission change', async () => {
    await setTrainerProgrammes(trainerId('T01'), {
      programmes: ['A', 'C'],
      reason: 'Covering the storytelling sample',
    })
    const event = db.auditEvents.find(
      (e) => e.action === 'permission.change' && e.objectId === 'T01',
    )
    expect(event?.before).toEqual({ approvedProgrammes: ['A'] })
    expect(event?.after).toEqual({ approvedProgrammes: ['A', 'C'] })
    expect(event?.reason).toBe('Covering the storytelling sample')
  })
})

describe('sessions and late change requests', () => {
  test('lists 30 sessions; detail includes roster and reschedule history', async () => {
    const { items } = await listSessions()
    expect(items).toHaveLength(30)
    const moved = items.find((s) => s.reschedules > 0)
    const detail = await getSession(moved?.id ?? '')
    expect(detail.reschedules[0]?.affectedRsvps).toBe(18)
    expect(detail.roster.length).toBeGreaterThan(0)
  })

  test('two seeded late requests are pending', async () => {
    const { items } = await listChangeRequests()
    expect(items).toHaveLength(2)
    expect(items.every((r) => r.decision === null)).toBe(true)
  })

  test('approving releases the seat, audits, notifies, and cannot be decided twice', async () => {
    const [request] = (await listChangeRequests()).items
    if (!request) throw new Error('no late request')
    const rsvp = db.rsvps.find((r) => r.id === request.rsvpId)
    const previous = rsvp?.status
    expect(previous === 'confirmed' || previous === 'waitlisted').toBe(true)
    const confirmedBefore = db.rsvps.filter(
      (r) => r.sessionId === request.session.id && r.status === 'confirmed',
    ).length

    const result = await decideChangeRequest(request.rsvpId, {
      decision: 'approved',
      note: 'Rebook next week',
    })
    expect(result).toMatchObject({ decision: 'approved', released: true })
    expect(rsvp?.status).toBe('cancelled')
    const confirmedAfter = db.rsvps.filter(
      (r) => r.sessionId === request.session.id && r.status === 'confirmed',
    ).length
    const waitlisted = db.rsvps.some(
      (r) => r.sessionId === request.session.id && r.status === 'waitlisted',
    )
    // A released confirmed seat is either refilled from the waitlist or left free.
    if (previous === 'confirmed')
      expect(confirmedAfter).toBe(waitlisted ? confirmedBefore : confirmedBefore - 1)
    expect(
      db.auditEvents.find((e) => e.action === 'rsvp.change_approved' && e.objectId === rsvp?.id),
    ).toBeTruthy()
    expect(
      db.notifications.some(
        (n) => n.eventId === `evt-change-decision-${rsvp?.id}` && n.recipientId === rsvp?.learnerId,
      ),
    ).toBe(true)
    const decided = (await listChangeRequests()).items.find((r) => r.rsvpId === request.rsvpId)
    expect(decided?.decision?.outcome).toBe('approved')
    await expect(
      decideChangeRequest(request.rsvpId, { decision: 'declined' }),
    ).rejects.toMatchObject({ status: 409, code: 'ALREADY_DECIDED' })
  })

  test('declining keeps the booking', async () => {
    const [, request] = (await listChangeRequests()).items
    if (!request) throw new Error('no late request')
    const rsvp = db.rsvps.find((r) => r.id === request.rsvpId)
    const status = rsvp?.status
    const result = await decideChangeRequest(request.rsvpId, { decision: 'declined' })
    expect(result.released).toBe(false)
    expect(rsvp?.status).toBe(status)
  })
})

describe('governance', () => {
  test('hub counts come from the data', async () => {
    const body = await getHubOverview()
    expect(body.counts).toMatchObject({
      users: 1211,
      learners: 1200,
      trainers: 10,
      programmes: 3,
      courses: 7,
      sessions: 30,
    })
  })

  test('the permission matrix lists the nine brief rows first', async () => {
    const body = await getPermissions()
    expect(body.rows.filter((r) => r.fromBrief)).toHaveLength(9)
    expect(body.blockedExportMessage).toBe(EXPORT_BLOCKED_MESSAGE)
    expect(body.fields.find((f) => f.role === 'trainer')?.fields).toEqual([
      'learnerCode',
      'displayName',
    ])
  })

  test('integrations are Demo or Not connected, never Connected, with evidence', async () => {
    const { items } = await listIntegrations()
    expect(items).toHaveLength(4)
    for (const item of items) {
      expect(['Demo', 'Not connected']).toContain(item.state)
      expect(item.evidence.length).toBeGreaterThan(0)
    }
    expect(items.find((i) => i.key === 'crm')?.state).toBe('Not connected')
  })

  test('audit log filters by outcome and action, and pages', async () => {
    const denied = await listAudit({ outcome: 'denied' })
    expect(denied.total).toBeGreaterThan(0)
    expect(denied.items.every((e) => e.outcome === 'denied')).toBe(true)
    const issued = await listAudit({ action: 'certificate.issue', pageSize: 50 })
    expect(issued.total).toBe(120)
    expect(issued.items).toHaveLength(50)
  })

  test('the audit CSV export respects filters, hides contact data and is audited', async () => {
    const { csv, rows, filename } = await exportAuditCsv({ outcome: 'denied' })
    expect(filename).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(csv.trim().split('\r\n')).toHaveLength(rows + 1)
    expect(csv).not.toContain('@example.com')
    const event = db.auditEvents.find((e) => e.objectId === 'audit-log')
    expect((event?.after as { rows?: number } | null)?.rows).toBe(rows)
  })
})

describe('access', () => {
  for (const id of ['user-l0001', 'user-t01']) {
    test(`${id} is refused every admin service`, async () => {
      actAs(db, id)
      for (const call of [
        () => listProgrammes(),
        () => updateProgramme(programmeId('B'), { title: 'Hacked title' }),
        () => listCourses(),
        () => listAssessments(),
        () => listTrainers(),
        () => listSessions(),
        () => listChangeRequests(),
        () => getHubOverview(),
        () => listAudit(),
        () => exportAuditCsv(),
      ]) {
        await expect(call()).rejects.toMatchObject({ status: 403 })
      }
    })
  }
})
