import { beforeAll, describe, expect, test } from 'bun:test'
import { DEMO_LEARNERS, DEMO_TRAINER_EMAIL } from '@shared/constants'
import type { DemoDb } from '@/mocks/db'
import { createDemoDb } from '@/mocks/db'
import { TEST_REFERENCE_DATE } from './helpers'

/**
 * Seed reconciliation (brief §15–16), ported from server/db/seed/seed.test.ts: every total, the
 * status grid, the persona states, the session rules, and determinism. Runs against a freshly
 * built in-memory DemoDb.
 */

const DAY = 86_400_000
/** The demo "now": 08:00 Qatar on the reference date. */
const DEMO_NOW = Date.parse(`${TEST_REFERENCE_DATE}T08:00:00+03:00`)

let db: DemoDb

const count = <T>(rows: readonly T[], predicate: (row: T) => boolean = () => true) =>
  rows.filter(predicate).length

/** Lookups the SQL joins used to do. */
function lookups(d: DemoDb) {
  const programmeCode = new Map(d.programmes.map((p) => [p.id, p.code]))
  const assessmentKind = new Map(d.assessments.map((a) => [a.id, a.kind]))
  const courseCode = new Map(d.courses.map((c) => [c.id, c.code]))
  const enrolment = new Map(d.enrolments.map((e) => [e.id, e]))
  const session = new Map(d.sessions.map((s) => [s.id, s]))
  const organisation = new Map(d.organisations.map((o) => [o.id, o]))
  const kindOf = (attempt: { assessmentId: string }) => assessmentKind.get(attempt.assessmentId)
  const codeOfEnrolment = (enrolmentId: string) => {
    const e = enrolment.get(enrolmentId)
    return e ? programmeCode.get(e.programmeId) : undefined
  }
  return {
    programmeCode,
    courseCode,
    enrolment,
    session,
    organisation,
    kindOf,
    codeOfEnrolment,
  }
}

let L: ReturnType<typeof lookups>

beforeAll(() => {
  db = createDemoDb(TEST_REFERENCE_DATE)
  L = lookups(db)
})

const attemptsOf = (enrolmentId: string) =>
  db.assessmentAttempts.filter((a) => a.enrolmentId === enrolmentId)

describe('learners and enrolments (brief §15)', () => {
  test('1,200 unique learners with name-based example.com emails', () => {
    const learners = db.users.filter((u) => u.role === 'learner')
    expect(learners).toHaveLength(1200)
    expect(new Set(db.enrolments.map((e) => e.learnerId)).size).toBe(1200)
    // Deviation 6: firstname.lastname@example.com instead of learnerNNNN@example.com.
    const pattern = /^[a-z]+\.[a-z]+\d*@example\.com$/
    expect(count(learners, (u) => pattern.test(u.email))).toBe(1200)
    expect(count(learners, (u) => u.email === 'mariam.alnuaimi@example.com')).toBe(1)
    expect(count(db.users, (u) => u.email === 'maha.alnouri@example.com')).toBe(1)
  })

  test('every seeded address is unique and name-based, except the admin', () => {
    expect(new Set(db.users.map((u) => u.email)).size).toBe(db.users.length)
    const pattern = /^[a-z]+\.[a-z]+\d*@example\.com$/
    const odd = db.users.filter((u) => !pattern.test(u.email)).map((u) => u.email)
    expect(odd).toEqual(['admin@example.com'])
    expect(db.users.find((u) => u.id === 'user-t01')?.email).toBe('amal.alnouri@example.com')
  })

  test('360 A-only, 600 B-only, 180 C-only and 60 in both A and B', () => {
    const combos = new Map<string, string[]>()
    for (const e of db.enrolments) {
      const list = combos.get(e.learnerId) ?? []
      list.push(L.programmeCode.get(e.programmeId) ?? '?')
      combos.set(e.learnerId, list)
    }
    const byCombo: Record<string, number> = {}
    for (const codes of combos.values()) {
      const combo = codes.sort().join('')
      byCombo[combo] = (byCombo[combo] ?? 0) + 1
    }
    expect(byCombo).toEqual({ A: 360, B: 600, C: 180, AB: 60 })
  })

  test('enrolments: A 420, B 660, C 180, total 1,260', () => {
    const by: Record<string, number> = {}
    for (const e of db.enrolments) {
      const code = L.programmeCode.get(e.programmeId) ?? '?'
      by[code] = (by[code] ?? 0) + 1
    }
    expect(by).toEqual({ A: 420, B: 660, C: 180 })
    expect(db.enrolments).toHaveLength(1260)
  })

  test('the status grid matches exactly', () => {
    const lookup = (code: string, status: string) =>
      count(
        db.enrolments,
        (e) => L.programmeCode.get(e.programmeId) === code && e.status === status,
      )
    const expected = {
      A: { not_started: 60, in_progress: 180, awaiting_review: 60, completed: 120 },
      B: { not_started: 90, in_progress: 240, awaiting_review: 30, completed: 300 },
      C: { not_started: 30, in_progress: 90, awaiting_review: 0, completed: 60 },
    }
    for (const [code, statuses] of Object.entries(expected)) {
      for (const [status, n] of Object.entries(statuses)) {
        expect(lookup(code, status)).toBe(n)
      }
    }
  })

  test('organisation types 420/240/180/120/120/120', () => {
    const by: Record<string, number> = {}
    for (const p of db.profiles) {
      const type = p.organisationId ? L.organisation.get(p.organisationId)?.type : undefined
      if (type) by[type] = (by[type] ?? 0) + 1
    }
    expect(by.hotel_accommodation).toBe(420)
    // Brief grid is 240. Noor (L0036) takes a tour-operator slot but has not filled in her
    // profile yet, so it shows 239 until she completes the wizard.
    expect(by.tour_operator).toBe(239)
    expect(db.profiles.find((p) => p.learnerCode === 'L0036')?.organisationId).toBeNull()
    expect(by.transport).toBe(180)
    expect(by.travel_trade).toBe(120)
    expect(by.attraction_venue).toBe(120)
    expect((by.independent ?? 0) + (by.other ?? 0)).toBe(120)
  })

  test('seniority 180/300/420/180/120', () => {
    const by: Record<string, number> = {}
    for (const p of db.profiles) by[p.seniority ?? 'none'] = (by[p.seniority ?? 'none'] ?? 0) + 1
    expect(by.student_trainee).toBe(180)
    // Brief grid is 300; Noor (L0036) holds an entry-level slot with her profile still blank.
    expect(by.entry_level).toBe(299)
    expect(by.none).toBe(1)
    expect(by.experienced_professional).toBe(420)
    expect(by.supervisor).toBe(180)
    expect((by.manager ?? 0) + (by.senior_leader ?? 0)).toBe(120)
  })

  test('at least 20 fictional "Demo" organisations; learners use them or a labelled pseudo-organisation', () => {
    expect(count(db.organisations, (o) => o.name.startsWith('Demo '))).toBeGreaterThanOrEqual(20)
    expect(
      count(db.profiles, (p) => {
        const o = p.organisationId ? L.organisation.get(p.organisationId) : undefined
        return Boolean(o && !o.name.startsWith('Demo ') && !o.isPseudo)
      }),
    ).toBe(0)
  })

  test('no real contact data: no mobile numbers, every email ends in example.com', () => {
    expect(count(db.profiles, (p) => p.mobile !== null)).toBe(0)
    expect(count(db.users, (u) => !u.email.endsWith('@example.com'))).toBe(0)
  })
})

describe('certificates and assessments', () => {
  test('120 current A certificates, one per completed A enrolment, none for B or C', () => {
    // Four prior-cycle credentials (evidence.priorCycle) sit beside the 120 current ones.
    const current = db.certificates.filter((c) => !c.evidence.priorCycle)
    const priorCycle = db.certificates.filter((c) => c.evidence.priorCycle)
    expect(priorCycle).toHaveLength(4)
    expect(count(db.certificates, (c) => c.status === 'issued')).toBe(123)
    expect(count(current, (c) => c.status === 'issued')).toBe(120)
    expect(
      count(current, (c) => {
        const e = L.enrolment.get(c.enrolmentId)
        return L.codeOfEnrolment(c.enrolmentId) === 'A' && e?.status === 'completed'
      }),
    ).toBe(120)
    expect(count(db.certificates, (c) => L.programmeCode.get(c.programmeId) !== 'A')).toBe(0)
    expect(new Set(current.map((c) => c.enrolmentId)).size).toBe(120)
    expect(db.programmes.find((p) => p.code === 'B')?.certificationEnabled).toBe(false)
  })

  test('completed A and B enrolments have a matched pre/post pair; others have no post', () => {
    const withPair = count(db.enrolments, (e) => {
      const code = L.programmeCode.get(e.programmeId)
      if ((code !== 'A' && code !== 'B') || e.status !== 'completed') return false
      const kinds = new Set(attemptsOf(e.id).map(L.kindOf))
      return kinds.has('pre') && kinds.has('post')
    })
    expect(withPair).toBe(420)
    expect(
      count(
        db.assessmentAttempts,
        (a) => L.kindOf(a) === 'post' && L.enrolment.get(a.enrolmentId)?.status !== 'completed',
      ),
    ).toBe(0)
    expect(count(db.assessmentAttempts, (a) => L.codeOfEnrolment(a.enrolmentId) === 'C')).toBe(0)
  })

  test('A completion rules hold: post at least 80, assignment approved at 70+, session passed', () => {
    expect(
      count(
        db.assessmentAttempts,
        (a) =>
          L.kindOf(a) === 'post' && (a.score ?? 0) < 80 && L.codeOfEnrolment(a.enrolmentId) === 'A',
      ),
    ).toBe(0)
    const completedA = db.enrolments.filter(
      (e) => L.programmeCode.get(e.programmeId) === 'A' && e.status === 'completed',
    )
    const approved = (enrolmentId: string) =>
      db.submissions.some(
        (s) =>
          s.enrolmentId === enrolmentId &&
          db.reviews.some(
            (r) => r.submissionId === s.id && r.status === 'approved' && r.rubricScore >= 70,
          ),
      )
    expect(count(completedA, (e) => !approved(e.id))).toBe(0)
    expect(
      count(completedA, (e) =>
        db.unitProgress.some(
          (u) =>
            u.enrolmentId === e.id &&
            L.courseCode.get(u.courseId) === 'C06' &&
            u.status === 'completed',
        ),
      ),
    ).toBe(120)
  })

  test('improvement is positive on average (pre/post pairs)', () => {
    const gains: number[] = []
    for (const pre of db.assessmentAttempts.filter((a) => L.kindOf(a) === 'pre')) {
      for (const post of attemptsOf(pre.enrolmentId).filter((a) => L.kindOf(a) === 'post')) {
        gains.push((post.score ?? 0) - (pre.score ?? 0))
      }
    }
    const average = gains.reduce((sum, g) => sum + g, 0) / gains.length
    expect(average).toBeGreaterThan(20)
  })
})

describe('personas (brief §15)', () => {
  const profileOf = (code: string) => db.profiles.find((p) => p.learnerCode === code)
  const scoresOf = (learnerId: string, kind: string) =>
    db.assessmentAttempts.filter((a) => a.learnerId === learnerId && L.kindOf(a) === kind)

  test('L0001–L0005 have the documented identities and name-based emails', () => {
    const expected = [
      ['Maha Al Nouri', 'maha.alnouri@example.com'],
      ['Omar Al Safi', 'omar.alsafi@example.com'],
      ['Leila Rahman', 'leila.rahman@example.com'],
      ['Daniel Costa', 'daniel.costa@example.com'],
      ['Sara Mansour', 'sara.mansour@example.com'],
    ]
    for (const [index, [name, email]] of expected.entries()) {
      const profile = profileOf(`L000${index + 1}`)
      expect(profile?.fullName).toBe(name)
      expect(db.users.find((u) => u.id === profile?.userId)?.email).toBe(email)
    }
  })

  test('every sign-in demo learner exists with that name, address and id', () => {
    for (const l of DEMO_LEARNERS) {
      expect(db.users.find((u) => u.email === l.email)).toMatchObject({
        id: l.userId,
        name: l.name,
      })
    }
    expect(db.users.find((u) => u.email === DEMO_TRAINER_EMAIL)?.role).toBe('trainer')
  })

  test('Noor (L0036) starts fresh: blank draft profile at wizard step 1', () => {
    const noor = profileOf('L0036')
    expect(noor).toMatchObject({
      userId: 'user-l0036',
      fullName: 'Noor Haddad',
      status: 'draft',
      wizardStep: 1,
      completeness: 0,
      organisationId: null,
      jobTitle: null,
      jobFunction: null,
      seniority: null,
      experience: null,
      country: null,
      goals: [],
      weeklyMinutes: null,
      consentAcceptedAt: null,
    })
    expect(db.users.find((u) => u.id === 'user-l0036')?.email).toBe('noor.haddad@example.com')
  })

  test('Noor holds only Program B, not started, with no activity yet', () => {
    const own = db.enrolments.filter((e) => e.learnerId === 'user-l0036')
    expect(own.map((e) => [L.programmeCode.get(e.programmeId), e.status])).toEqual([
      ['B', 'not_started'],
    ])
    // Only her account, profile and enrolment mention her: no baseline, units, practice,
    // bookings, notifications or credentials.
    const mentions = Object.entries(db)
      .filter(([, rows]) => Array.isArray(rows))
      .filter(([, rows]) => JSON.stringify(rows).includes('"user-l0036"'))
      .map(([name]) => name)
      .sort()
    expect(mentions).toEqual(['enrolments', 'profiles', 'users'])
  })

  test('Maha: B, baseline 40, Demo Pearl Hospitality, guest relations officer, 4–7 years', () => {
    const maha = profileOf('L0001')
    const org = maha?.organisationId ? L.organisation.get(maha.organisationId) : undefined
    expect(maha).toMatchObject({
      jobTitle: 'Guest Relations Officer',
      experience: '4_7',
      weeklyMinutes: 60,
      seniority: 'experienced_professional',
      preferredLanguage: 'English',
    })
    expect(org).toMatchObject({ name: 'Demo Pearl Hospitality', type: 'hotel_accommodation' })
    expect(maha?.goals).toEqual(['complaint_handling', 'communication'])
    const enrolments = db.enrolments
      .filter((e) => e.learnerId === 'user-l0001')
      .map((e) => ({
        code: L.programmeCode.get(e.programmeId),
        status: e.status,
        path: db.learningPaths.find((p) => p.id === e.pathId)?.code,
      }))
    expect(enrolments).toEqual([{ code: 'B', status: 'in_progress', path: 'B-HOTEL' }])
    expect(scoresOf('user-l0001', 'pre').map((a) => a.score)).toEqual([40])
    expect(scoresOf('user-l0001', 'post')).toHaveLength(0)
    expect(count(db.rolePlayAttempts, (r) => r.learnerId === 'user-l0001')).toBe(0)
  })

  test('Omar: A, Level 1 complete, eligible but with no booking', () => {
    const enrolments = db.enrolments.filter((e) => e.learnerId === 'user-l0002')
    expect(
      enrolments.map((e) => ({ status: e.status, code: L.programmeCode.get(e.programmeId) })),
    ).toEqual([{ status: 'in_progress', code: 'A' }])
    expect(count(scoresOf('user-l0002', 'formative'), (a) => (a.score ?? 0) >= 80)).toBe(1)
    expect(count(db.rsvps, (r) => r.learnerId === 'user-l0002')).toBe(0)
  })

  test('Leila: A and B with distinct progress', () => {
    const e = db.enrolments
      .filter((x) => x.learnerId === 'user-l0003')
      .map((x) => ({ code: L.programmeCode.get(x.programmeId) ?? '', progress: x.progressPercent }))
      .sort((a, b) => a.code.localeCompare(b.code))
    expect(e.map((x) => x.code)).toEqual(['A', 'B'])
    expect(e[0]?.progress).not.toBe(e[1]?.progress)
  })

  test('Daniel: A assignment returned for revision', () => {
    const rows = db.submissions
      .filter((s) => s.learnerId === 'user-l0004')
      .flatMap((s) => {
        const review = db.reviews.find((r) => r.submissionId === s.id)
        return review ? [{ status: s.status, review: review.status, version: s.version }] : []
      })
    expect(rows).toEqual([{ status: 'returned', review: 'returned', version: 1 }])
  })

  test('Sara: B completed, pre 60, post 100, no certificate', () => {
    const attempts = db.assessmentAttempts
      .filter((a) => a.learnerId === 'user-l0005')
      .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))
      .map((a) => ({ kind: L.kindOf(a), score: a.score }))
    expect(attempts).toEqual([
      { kind: 'pre', score: 60 },
      { kind: 'post', score: 100 },
    ])
    expect(db.enrolments.find((e) => e.learnerId === 'user-l0005')?.status).toBe('completed')
    expect(count(db.certificates, (c) => c.learnerId === 'user-l0005')).toBe(0)
  })
})

describe('trainers and sessions (brief §16)', () => {
  test('ten trainers with name-based emails; T04 is renamed', () => {
    expect(
      count(db.users, (u) => u.role === 'trainer' && /^[a-z]+\.[a-z]+@example\.com$/.test(u.email)),
    ).toBe(10)
    expect(db.users.find((u) => u.id === 'user-t04')?.email).toBe('rafael.sousa@example.com')
    const t04 = db.trainerProfiles.find((t) => t.code === 'T04')
    expect(t04?.fullName).toBe('Rafael Sousa')
    expect(count(db.trainerProfiles, (t) => t.fullName === 'Daniel Costa')).toBe(0)
    expect(t04?.languages).toEqual(['English', 'Portuguese'])
  })

  test('30 sessions, 3 per trainer, 60 minutes, Asia/Qatar', () => {
    expect(db.sessions).toHaveLength(30)
    const perTrainer = new Map<string, number>()
    for (const s of db.sessions) perTrainer.set(s.trainerId, (perTrainer.get(s.trainerId) ?? 0) + 1)
    expect(perTrainer.size).toBe(10)
    expect([...perTrainer.values()].every((n) => n === 3)).toBe(true)
    expect(
      count(db.sessions, (s) => Date.parse(s.endsAt) - Date.parse(s.startsAt) !== 60 * 60_000),
    ).toBe(0)
    expect(count(db.sessions, (s) => s.timezone !== 'Asia/Qatar')).toBe(0)
  })

  test('each trainer has one completed (Day -14..-5), one upcoming (per table) and one later (Day +9..+18) session', () => {
    const reference = Date.parse(`${TEST_REFERENCE_DATE}T00:00:00+03:00`)
    for (const session of db.sessions) {
      const slot = session.code.at(-1)
      const offset = Math.floor((Date.parse(session.startsAt) - reference) / DAY)
      if (slot === '1') expect(offset >= -14 && offset <= -5).toBe(true)
      if (slot === '2') expect(offset >= 2 && offset <= 6).toBe(true)
      if (slot === '3') expect(offset >= 9 && offset <= 18).toBe(true)
    }
    // Table spot checks (brief §16): T01 Day +2 09:00, T10 Day +6 13:00, Qatar time.
    expect(db.sessions.find((s) => s.code === 'SES-T01-2')?.startsAt).toBe(
      '2026-10-29T06:00:00.000Z',
    )
    expect(db.sessions.find((s) => s.code === 'SES-T10-2')?.startsAt).toBe(
      '2026-11-02T10:00:00.000Z',
    )
  })

  test('upcoming session capacities and venues follow the table', () => {
    const expected: Record<string, [number, string]> = {
      'SES-T01-2': [24, 'in_person'],
      'SES-T02-2': [30, 'online'],
      'SES-T03-2': [20, 'in_person'],
      'SES-T04-2': [30, 'online'],
      'SES-T05-2': [24, 'in_person'],
      'SES-T06-2': [40, 'online'],
      'SES-T07-2': [20, 'in_person'],
      'SES-T08-2': [35, 'online'],
      'SES-T09-2': [30, 'online'],
      'SES-T10-2': [24, 'in_person'],
    }
    const upcoming = db.sessions.filter((s) => s.code.endsWith('-2'))
    expect(upcoming).toHaveLength(10)
    for (const s of upcoming)
      expect([s.capacity, s.format] as [number, string]).toEqual(expected[s.code] ?? [0, ''])
    expect(db.sessions.find((s) => s.code === 'SES-T01-2')?.room).toBe('Room 1')
    expect(db.sessions.find((s) => s.code === 'SES-T07-2')?.venue).toBe('Demo Training Studio')
  })

  test('includes a full session, a waitlist, a cancelled historical session and a rescheduled one', () => {
    expect(count(db.sessions, (s) => s.status === 'full')).toBe(1)
    expect(count(db.rsvps, (r) => r.status === 'waitlisted')).toBeGreaterThan(0)
    expect(
      count(db.sessions, (s) => s.status === 'cancelled' && Date.parse(s.startsAt) < DEMO_NOW),
    ).toBe(1)
    expect(db.sessionReschedules).toHaveLength(1)
    expect(db.sessionReschedules[0]?.affectedRsvps).toBe(18)
  })

  test('capacity is never exceeded and the full session is exactly full', () => {
    const confirmed = (sessionId: string) =>
      count(db.rsvps, (r) => r.sessionId === sessionId && r.status === 'confirmed')
    expect(count(db.sessions, (s) => s.capacity < confirmed(s.id))).toBe(0)
    const full = db.sessions.find((s) => s.status === 'full')
    expect(full && confirmed(full.id)).toBe(full?.capacity)
    // Waitlists exist only on full sessions.
    expect(
      count(
        db.rsvps,
        (r) => r.status === 'waitlisted' && L.session.get(r.sessionId)?.status !== 'full',
      ),
    ).toBe(0)
  })

  test('no trainer overlap', () => {
    const overlaps = db.sessions.flatMap((a) =>
      db.sessions.filter(
        (b) =>
          a.trainerId === b.trainerId &&
          a.id < b.id &&
          a.startsAt < b.endsAt &&
          b.startsAt < a.endsAt,
      ),
    )
    expect(overlaps).toHaveLength(0)
  })

  test('no learner holds two overlapping active reservations', () => {
    const active = db.rsvps.filter((r) => r.status === 'confirmed' || r.status === 'waitlisted')
    const overlaps = active.flatMap((ra) => {
      const sa = L.session.get(ra.sessionId)
      return active.filter((rb) => {
        const sb = L.session.get(rb.sessionId)
        return (
          rb.learnerId === ra.learnerId &&
          rb.id < ra.id &&
          sa !== undefined &&
          sb !== undefined &&
          sa.startsAt < sb.endsAt &&
          sb.startsAt < sa.endsAt
        )
      })
    })
    expect(overlaps).toHaveLength(0)
  })

  test('RSVPs come from eligible learners (A sessions need Level 1 complete); optional sessions are not gates', () => {
    const aRsvps = db.rsvps.filter((r) => {
      const s = L.session.get(r.sessionId)
      return s !== undefined && L.programmeCode.get(s.programmeId) === 'A'
    })
    expect(
      count(aRsvps, (r) => {
        if (r.status !== 'confirmed' && r.status !== 'waitlisted') return false
        const s = L.session.get(r.sessionId)
        const e = db.enrolments.find(
          (x) => x.learnerId === r.learnerId && x.programmeId === s?.programmeId,
        )
        return e?.status === 'not_started'
      }),
    ).toBe(0)
    const passedQuiz = (learnerId: string) =>
      db.assessmentAttempts.some(
        (a) =>
          L.enrolment.get(a.enrolmentId)?.learnerId === learnerId &&
          L.kindOf(a) === 'formative' &&
          (a.score ?? 0) >= 80,
      )
    expect(count(aRsvps, (r) => r.status !== 'cancelled' && !passedQuiz(r.learnerId))).toBe(0)
    expect(count(db.sessions, (s) => s.prerequisite === null && s.isCompletionGate)).toBe(0)
    expect(
      count(db.sessions, (s) => L.programmeCode.get(s.programmeId) !== 'A' && s.isCompletionGate),
    ).toBe(0)
  })

  test('completed sessions have attendance, scores and feedback; cancelled ones have none', () => {
    expect(
      count(
        db.rsvps,
        (r) =>
          L.session.get(r.sessionId)?.status === 'completed' &&
          r.status === 'confirmed' &&
          !db.attendance.some((a) => a.rsvpId === r.id),
      ),
    ).toBe(0)
    expect(count(db.attendance, (a) => L.session.get(a.sessionId)?.status === 'cancelled')).toBe(0)
    expect(
      count(
        db.attendance,
        (a) =>
          (a.status === 'attended' || a.status === 'late') &&
          !db.sessionScores.some((x) => x.rsvpId === a.rsvpId && x.feedback !== null),
      ),
    ).toBe(0)
    // Absence never becomes a pass.
    expect(
      count(
        db.attendance,
        (a) =>
          (a.status === 'absent' || a.status === 'excused') &&
          db.sessionScores.some((x) => x.rsvpId === a.rsvpId),
      ),
    ).toBe(0)
    // Rubric rows add up and respect their maxima.
    expect(
      count(
        db.sessionScores,
        (x) =>
          x.total !== x.preparation + x.communication + x.practical + x.professionalism ||
          x.preparation > 20 ||
          x.communication > 30 ||
          x.practical > 30 ||
          x.professionalism > 20,
      ),
    ).toBe(0)
  })

  test('rescheduled session keeps its ID, RSVPs and one notification pair per affected RSVP', () => {
    const change = db.sessionReschedules[0]
    expect(
      count(db.rsvps, (r) => r.sessionId === change?.sessionId && r.status === 'confirmed'),
    ).toBe(18)
    const notes = db.notifications.filter((n) => n.eventId === change?.eventId)
    expect(count(notes, (n) => n.channel === 'in_app')).toBe(18)
    expect(count(notes, (n) => n.channel === 'email')).toBe(18)
    expect(
      count(
        db.notifications,
        (n) => n.channel === 'email' && n.state !== 'simulated' && n.kind.startsWith('session_'),
      ),
    ).toBe(0)
  })
})

describe('activity window and review cases', () => {
  test('registrations fall within the 90-day window of the reference date', () => {
    const days = db.profiles.map((p) => (DEMO_NOW - Date.parse(p.registeredAt)) / DAY)
    expect(Math.min(...days)).toBeGreaterThanOrEqual(-1)
    expect(Math.max(...days)).toBeLessThanOrEqual(91)
  })

  test('some learners are inactive for 14+ days; most are active', () => {
    const lastActivity = (iso: string | null) => (iso ? Date.parse(iso) : Number.NaN)
    expect(
      count(
        db.enrolments,
        (e) => e.status === 'in_progress' && lastActivity(e.lastActivityAt) < DEMO_NOW - 14 * DAY,
      ),
    ).toBeGreaterThan(20)
    const active = new Set(
      db.enrolments
        .filter((e) => lastActivity(e.lastActivityAt) >= DEMO_NOW - 30 * DAY)
        .map((e) => e.learnerId),
    )
    expect(active.size).toBeGreaterThan(300)
  })

  test('no timestamp is in the future of the demo "now"', () => {
    const future = (iso: string | null) => iso !== null && Date.parse(iso) > DEMO_NOW
    expect(
      count(db.enrolments, (e) => future(e.lastActivityAt)) +
        count(db.submissions, (s) => future(s.submittedAt)) +
        count(db.certificates, (c) => future(c.issuedAt)) +
        count(db.assessmentAttempts, (a) => future(a.submittedAt)),
    ).toBe(0)
  })

  test('review cases exist: absent learners, failed prerequisite, resubmissions, overdue marking', () => {
    expect(count(db.attendance, (a) => a.status === 'absent')).toBeGreaterThanOrEqual(5)
    expect(
      count(db.enrolments, (e) => {
        if (e.status !== 'in_progress') return false
        const quiz = attemptsOf(e.id).filter((a) => L.kindOf(a) === 'formative')
        return quiz.some((a) => (a.score ?? 0) < 80) && !quiz.some((a) => (a.score ?? 0) >= 80)
      }),
    ).toBe(15)
    expect(count(db.submissions, (s) => s.version === 2 && s.status === 'submitted')).toBe(15)
    expect(
      count(
        db.submissions,
        (s) =>
          (s.status === 'submitted' || s.status === 'under_review') &&
          Date.parse(s.submittedAt) < DEMO_NOW - 5 * DAY,
      ),
    ).toBeGreaterThanOrEqual(10)
  })

  test('awaiting-review enrolments all have a pending submission; B has none for certificates', () => {
    expect(
      count(
        db.enrolments,
        (e) =>
          e.status === 'awaiting_review' &&
          !db.submissions.some(
            (s) =>
              s.enrolmentId === e.id && (s.status === 'submitted' || s.status === 'under_review'),
          ),
      ),
    ).toBe(0)
  })
})

describe('accounts', () => {
  test('an admin, ten trainers and 1,200 learners, all verified', () => {
    expect(count(db.users, (u) => u.role === 'admin' && u.email === 'admin@example.com')).toBe(1)
    expect(count(db.users, (u) => !u.emailVerified)).toBe(0)
    expect(db.users).toHaveLength(1211)
    expect(Object.keys(db.passwords)).toHaveLength(0)
  })
})

describe('seeded activity', () => {
  const qatarHour = (iso: string | null) =>
    iso === null ? 12 : new Date(Date.parse(iso) + 3 * 3_600_000).getUTCHours()
  const outside = (iso: string | null) => qatarHour(iso) < 8 || qatarHour(iso) > 19

  test('timestamps fall in Qatar working hours', () => {
    expect(
      count(db.assessmentAttempts, (a) => outside(a.submittedAt)) +
        count(db.certificates, (c) => outside(c.issuedAt)) +
        count(db.sessionScores, (s) => outside(s.finalisedAt)),
    ).toBe(0)
  })

  test('two late change requests wait for the admin', () => {
    expect(count(db.auditEvents, (e) => e.action === 'rsvp.change_requested')).toBe(2)
  })
})

describe('determinism', () => {
  const withoutSeededAt = (d: DemoDb) => ({ ...d, meta: { ...d.meta, seededAt: '' } })

  test('a second build produces identical rows in every table', () => {
    const second = createDemoDb(TEST_REFERENCE_DATE)
    expect(JSON.stringify(withoutSeededAt(second))).toBe(JSON.stringify(withoutSeededAt(db)))
  })

  test('a different reference date shifts the dates but not the counts', () => {
    const other = createDemoDb('2027-02-01')
    expect(other.enrolments).toHaveLength(1260)
    expect(other.certificates).toHaveLength(124)
    expect(other.sessions.find((s) => s.code === 'SES-T01-2')?.startsAt).toBe(
      '2027-02-03T06:00:00.000Z',
    )
  })

  test('ids are stable, UUID-shaped and unique per table', () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    for (const rows of [db.enrolments, db.sessions, db.rsvps, db.certificates, db.notifications]) {
      expect(rows.every((r) => uuid.test(r.id))).toBe(true)
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length)
    }
  })
})
