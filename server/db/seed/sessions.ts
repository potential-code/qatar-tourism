import type { AttendanceValue, ProgrammeCode } from '@shared/constants'
import { NOTIFICATION_TEMPLATES, renderTemplate } from '@shared/content/notifications'
import type {
  attendance as attendanceTable,
  notifications as notificationsTable,
  sessionReschedules as rescheduleTable,
  rsvps as rsvpsTable,
  sessionScores as scoresTable,
  sessions as sessionsTable,
} from '../schema'
import { formatQatarDateTime } from './format'
import { stableUuid } from './ids'
import type { EnrolmentPlan, SeedPlan } from './plan'
import type { Calendar } from './reference-date'
import type { Rng } from './rng'
import { TRAINERS, type TrainerSeed } from './trainers'

type SessionInsert = typeof sessionsTable.$inferInsert
type RsvpInsert = typeof rsvpsTable.$inferInsert
type AttendanceInsert = typeof attendanceTable.$inferInsert
type ScoreInsert = typeof scoresTable.$inferInsert
type RescheduleInsert = typeof rescheduleTable.$inferInsert
type NotificationInsert = typeof notificationsTable.$inferInsert

export type SessionLink = {
  sessionId: string
  rsvpId: string
  startsAt: Date
  attendance: AttendanceValue
  /** Final or draft score total, or null when unscored. */
  scoreTotal: number | null
  scoreStatus: 'draft' | 'final' | null
}

export type SessionsResult = {
  sessions: SessionInsert[]
  reschedules: RescheduleInsert[]
  rsvps: RsvpInsert[]
  attendance: AttendanceInsert[]
  scores: ScoreInsert[]
  notifications: NotificationInsert[]
  /** Completed-session outcome per enrolment id (programme-specific). */
  completedLinks: Map<string, SessionLink>
  /** Earliest booking instant per enrolment id, for upcoming/later sessions. */
  firstBookedAt: Map<string, Date>
  /** Enrolment ids holding an active RSVP on an upcoming or later session. */
  upcomingBooked: Set<string>
  /** Audit rows for the session events (reschedule, cancel). */
  auditHints: {
    kind: 'reschedule' | 'cancel'
    sessionId: string
    trainerUserId: string
    at: Date
    reason: string
    affected: number
    before: Record<string, unknown>
    after: Record<string, unknown>
  }[]
}

const CANCELLATION_POLICY =
  'Self-service changes until 24 hours before the session. Later changes request admin review.'
const ACCESS_NOTE =
  'Step-free entrance from the main lobby, lift to level 1, quiet room available on request.'
const JOIN_INSTRUCTIONS =
  'Simulated online classroom. The join link is a placeholder: no real meeting room is created for this demonstration.'

const FEEDBACK = [
  'Clear greeting and a good follow-up question. Next time, check understanding before moving on.',
  'Calm, respectful tone throughout. Offer the second option a little earlier.',
  'Strong preparation. Slow down when giving directions and confirm the next step.',
  'Good use of plain language. Try summarising the agreed action at the end.',
  'Confident delivery with specific options. Keep eye contact when listening.',
  'Excellent empathy. Verify availability before promising an alternative.',
  'Practical and well structured. Add a short closing check on what the visitor will do next.',
  'Professional throughout. Use the visitor’s name once more to build rapport.',
]

const DAY_MS = 86_400_000

type SlotPlan = {
  trainer: number
  kind: 'upcoming' | 'later'
  confirmed: number
  waitlist?: number
}

// A sessions: confirmed RSVPs per session (T03 upcoming is the full one; T05 later is the
// rescheduled one with 18 registered learners, matching the brief §11 modal example).
const A_SLOTS: readonly SlotPlan[] = [
  { trainer: 1, kind: 'upcoming', confirmed: 5 },
  { trainer: 2, kind: 'upcoming', confirmed: 4 },
  { trainer: 3, kind: 'upcoming', confirmed: 20, waitlist: 3 },
  { trainer: 4, kind: 'upcoming', confirmed: 4 },
  { trainer: 5, kind: 'upcoming', confirmed: 5 },
  { trainer: 7, kind: 'upcoming', confirmed: 4 },
  { trainer: 10, kind: 'upcoming', confirmed: 4 },
  { trainer: 1, kind: 'later', confirmed: 2 },
  { trainer: 2, kind: 'later', confirmed: 2 },
  { trainer: 3, kind: 'later', confirmed: 2 },
  { trainer: 4, kind: 'later', confirmed: 2 },
  { trainer: 5, kind: 'later', confirmed: 18 },
  { trainer: 7, kind: 'later', confirmed: 2 },
  { trainer: 10, kind: 'later', confirmed: 3 },
]

// Optional B (T06, T09) and C sample (T08) sessions: attendees for completed, upcoming, later.
const OPTIONAL_FILL: Record<number, { completed: number; upcoming: number; later: number }> = {
  6: { completed: 10, upcoming: 8, later: 4 },
  9: { completed: 8, upcoming: 6, later: 3 },
  8: { completed: 9, upcoming: 7, later: 3 },
}

const A_COMPLETED_TRAINERS = [1, 2, 3, 4, 5, 10] as const
const CANCELLED_TRAINER = 7

export function buildSessions(
  rootRng: Rng,
  cal: Calendar,
  plan: SeedPlan,
  programmeIds: Record<ProgrammeCode, string>,
): SessionsResult {
  const rng = rootRng.fork('sessions')
  const result: SessionsResult = {
    sessions: [],
    reschedules: [],
    rsvps: [],
    attendance: [],
    scores: [],
    notifications: [],
    completedLinks: new Map(),
    firstBookedAt: new Map(),
    upcomingBooked: new Set(),
    auditHints: [],
  }

  const sessionKey = (trainer: TrainerSeed, slot: 1 | 2 | 3) => `SES-${trainer.code}-${slot}`
  const sessionIdOf = (trainer: TrainerSeed, slot: 1 | 2 | 3) =>
    stableUuid('session', sessionKey(trainer, slot))
  const trainerByN = new Map(TRAINERS.map((t) => [t.n, t]))

  // --- Sessions -------------------------------------------------------------------------
  const sessionMeta = new Map<
    string,
    {
      trainer: TrainerSeed
      slot: 1 | 2 | 3
      startsAt: Date
      endsAt: Date
      capacity: number
      code: string
      programme: ProgrammeCode
      title: string
      status: SessionInsert['status']
    }
  >()

  for (const trainer of TRAINERS) {
    const up = trainer.upcoming
    for (const slot of [1, 2, 3] as const) {
      const day = slot === 1 ? trainer.completedDay : slot === 2 ? up.day : trainer.laterDay
      const startsAt = cal.at(day, up.time)
      const endsAt = new Date(startsAt.getTime() + 60 * 60_000)
      const cancelled = slot === 1 && trainer.n === CANCELLED_TRAINER
      const full = slot === 2 && trainer.n === 3
      const status: SessionInsert['status'] = cancelled
        ? 'cancelled'
        : slot === 1
          ? 'completed'
          : full
            ? 'full'
            : 'published'
      const title =
        slot === 1 ? `${up.title} (Cohort 1)` : slot === 3 ? `${up.title} (Cohort 3)` : up.title
      const inPerson = up.format === 'in_person'
      const [venue, room] = !inPerson
        ? [null, null]
        : up.venue.startsWith('Demo Academy')
          ? ['Demo Academy', up.venue.replace('Demo Academy ', '')]
          : [up.venue, 'Main studio']
      const id = sessionIdOf(trainer, slot)
      const code = sessionKey(trainer, slot)
      const createdAtSafe = new Date(startsAt.getTime() - (10 + rng.int(0, 5)) * DAY_MS)

      result.sessions.push({
        id,
        code,
        title,
        programmeId: programmeIds[up.programme],
        level: up.programme === 'A' ? 'Level 2' : null,
        stage: up.programme === 'A' ? 'Trainer-led application' : null,
        trainerId: trainer.id,
        format: up.format,
        startsAt,
        endsAt,
        timezone: 'Asia/Qatar',
        capacity: up.capacity,
        venue,
        room,
        accessNote: inPerson ? ACCESS_NOTE : null,
        meetingRef: inPerson ? null : `DEMO-ROOM-${trainer.code}-${slot}`,
        joinInstructions: inPerson ? null : JOIN_INSTRUCTIONS,
        bookingDeadline: new Date(startsAt.getTime() - 12 * 3_600_000),
        cancellationPolicy: CANCELLATION_POLICY,
        description: up.description,
        materials: [],
        prerequisite: up.programme === 'A' ? 'a_level1_complete' : null,
        isCompletionGate: up.programme === 'A',
        status,
        cancelledReason: cancelled
          ? 'The trainer was unavailable. Learners were offered alternative sessions.'
          : null,
        createdBy: trainer.userId,
        createdAt: createdAtSafe,
        updatedAt: createdAtSafe,
      })
      sessionMeta.set(id, {
        trainer,
        slot,
        startsAt,
        endsAt,
        capacity: up.capacity,
        code,
        programme: up.programme,
        title,
        status,
      })
    }
  }

  // --- RSVP bookkeeping -----------------------------------------------------------------
  const busy = new Map<number, { start: number; end: number }[]>()
  const overlaps = (learnerN: number, start: Date, end: Date) =>
    (busy.get(learnerN) ?? []).some(
      (slot) => start.getTime() < slot.end && end.getTime() > slot.start,
    )
  const reserve = (learnerN: number, start: Date, end: Date) => {
    const list = busy.get(learnerN) ?? []
    list.push({ start: start.getTime(), end: end.getTime() })
    busy.set(learnerN, list)
  }

  const rsvpIdOf = (sessionId: string, learnerCode: string, tag = '') =>
    stableUuid('rsvp', `${sessionId}:${learnerCode}${tag}`)

  const addRsvp = (
    enrolment: EnrolmentPlan,
    sessionId: string,
    status: RsvpInsert['status'],
    bookedAt: Date,
    extra: Partial<RsvpInsert> = {},
  ) => {
    const meta = sessionMeta.get(sessionId)
    if (!meta) throw new Error('Unknown session')
    const id = (extra.id as string | undefined) ?? rsvpIdOf(sessionId, enrolment.learner.code)
    result.rsvps.push({
      id,
      sessionId,
      learnerId: enrolment.learner.userId,
      status,
      waitlistPosition: null,
      bookedAt,
      createdAt: bookedAt,
      updatedAt: bookedAt,
      ...extra,
    })
    if (status === 'confirmed' || status === 'waitlisted')
      reserve(enrolment.learner.n, meta.startsAt, meta.endsAt)
    return id
  }

  const byProgrammeStage = (programme: ProgrammeCode, ...stages: string[]) =>
    plan.enrolments.filter((e) => e.programme === programme && stages.includes(e.stage))

  const scoreFor = (): {
    prep: number
    comm: number
    prac: number
    prof: number
    total: number
  } => {
    const base = rng.float(0.74, 0.97)
    const part = (max: number) =>
      Math.min(max, Math.max(0, Math.round(max * (base + rng.float(-0.04, 0.04)))))
    const prep = part(20)
    const comm = part(30)
    const prac = part(30)
    const prof = part(20)
    return { prep, comm, prac, prof, total: prep + comm + prac + prof }
  }

  const sessionOutcome = (
    enrolment: EnrolmentPlan,
    sessionId: string,
    attendanceValue: AttendanceValue,
    scoreStatus: 'draft' | 'final' | null,
    bookedAt: Date,
  ) => {
    const meta = sessionMeta.get(sessionId)
    if (!meta) throw new Error('Unknown session')
    const rsvpId = addRsvp(enrolment, sessionId, 'confirmed', bookedAt)
    const markedAt = new Date(meta.endsAt.getTime() + 2 * 3_600_000)
    result.attendance.push({
      id: stableUuid('attendance', rsvpId),
      rsvpId,
      sessionId,
      learnerId: enrolment.learner.userId,
      status: attendanceValue,
      markedBy: meta.trainer.userId,
      markedAt,
      createdAt: markedAt,
      updatedAt: markedAt,
    })
    let total: number | null = null
    if (scoreStatus && (attendanceValue === 'attended' || attendanceValue === 'late')) {
      const s = scoreFor()
      total = s.total
      const finalisedAt = new Date(markedAt.getTime() + rng.int(1, 20) * 3_600_000)
      result.scores.push({
        id: stableUuid('score', rsvpId),
        rsvpId,
        sessionId,
        learnerId: enrolment.learner.userId,
        preparation: s.prep,
        communication: s.comm,
        practical: s.prac,
        professionalism: s.prof,
        total: s.total,
        status: scoreStatus,
        feedback: rng.pick(FEEDBACK),
        correctionReason: null,
        scoredBy: meta.trainer.userId,
        finalisedAt: scoreStatus === 'final' ? finalisedAt : null,
        createdAt: markedAt,
        updatedAt: scoreStatus === 'final' ? finalisedAt : markedAt,
      })
    }
    result.completedLinks.set(enrolment.id, {
      sessionId,
      rsvpId,
      startsAt: meta.startsAt,
      attendance: attendanceValue,
      scoreTotal: total,
      scoreStatus: total === null ? null : scoreStatus,
    })
  }

  // --- Completed A sessions (6 active) --------------------------------------------------
  const completedA = A_COMPLETED_TRAINERS.map((n) => {
    const trainer = trainerByN.get(n) as TrainerSeed
    const id = sessionIdOf(trainer, 1)
    return { id, trainer, capacity: trainer.upcoming.capacity, used: 0 }
  })
  const takeSeat = (preferT10 = false) => {
    const open = completedA.filter((s) => s.used < s.capacity)
    const target = preferT10
      ? (completedA.find((s) => s.trainer.n === 10) as (typeof completedA)[number])
      : (open.sort(
          (a, b) => a.used / a.capacity - b.used / b.capacity,
        )[0] as (typeof completedA)[number])
    target.used += 1
    return target
  }

  const attendedPool = rng.fork('attended').shuffle(byProgrammeStage('A', 'attended'))
  const absentPool = rng.fork('absent').shuffle(byProgrammeStage('A', 'absent'))
  const middlePool = rng
    .fork('middle')
    .shuffle(byProgrammeStage('A', 'returned', 'submitted', 'resubmitted'))
  const completedPool = rng
    .fork('completed')
    .shuffle(byProgrammeStage('A', 'completed'))
    .slice(0, 40)

  const bookedAgo = (startsAt: Date) => (cal.nowMs - startsAt.getTime()) / DAY_MS + rng.float(3, 10)

  attendedPool.forEach((enrolment, index) => {
    const draft = index < 6 // T10's marking backlog: scores saved as draft, not yet final.
    const target = takeSeat(draft)
    const meta = sessionMeta.get(target.id)
    const startsAt = (meta as NonNullable<typeof meta>).startsAt
    sessionOutcome(
      enrolment,
      target.id,
      index % 6 === 5 ? 'late' : 'attended',
      draft ? 'draft' : 'final',
      cal.ago(bookedAgo(startsAt)),
    )
  })
  absentPool.forEach((enrolment, index) => {
    const target = takeSeat()
    const startsAt = (sessionMeta.get(target.id) as NonNullable<ReturnType<typeof sessionMeta.get>>)
      .startsAt
    sessionOutcome(
      enrolment,
      target.id,
      index < 7 ? 'absent' : 'excused',
      null,
      cal.ago(bookedAgo(startsAt)),
    )
  })
  for (const enrolment of [...middlePool, ...completedPool]) {
    const target = takeSeat()
    const startsAt = (sessionMeta.get(target.id) as NonNullable<ReturnType<typeof sessionMeta.get>>)
      .startsAt
    sessionOutcome(
      enrolment,
      target.id,
      rng.chance(0.1) ? 'late' : 'attended',
      'final',
      cal.ago(bookedAgo(startsAt)),
    )
  }

  // --- Cancelled historical session (T07) -----------------------------------------------
  const l1Done = plan.enrolments.filter((e) => e.programme === 'A' && e.stage === 'l1_done')
  const bookable = rng.fork('l1done').shuffle(l1Done.filter((e) => !e.keepUnbooked))
  const t07 = trainerByN.get(CANCELLED_TRAINER) as TrainerSeed
  const t07Id = sessionIdOf(t07, 1)
  const t07Meta = sessionMeta.get(t07Id) as NonNullable<ReturnType<typeof sessionMeta.get>>
  const cancelledLearners = bookable.slice(0, 12)
  const cancelEventId = `evt-cancel-${t07Meta.code}-1`
  const cancelReason = 'The trainer was unavailable. Learners were offered alternative sessions.'
  const cancelAt = new Date(t07Meta.startsAt.getTime() - 3 * DAY_MS)
  for (const enrolment of cancelledLearners) {
    addRsvp(enrolment, t07Id, 'cancelled', new Date(cancelAt.getTime() - rng.int(2, 6) * DAY_MS), {
      cancelledReason: 'Session cancelled by the Academy',
    })
    pushNotifications(
      enrolment,
      'session_cancelled',
      cancelEventId,
      t07,
      t07Meta.title,
      {
        'Date and time': formatQatarDateTime(t07Meta.startsAt),
        Reason: cancelReason,
      },
      cancelAt,
      t07Id,
    )
  }
  result.auditHints.push({
    kind: 'cancel',
    sessionId: t07Id,
    trainerUserId: t07.userId,
    at: cancelAt,
    reason: cancelReason,
    affected: cancelledLearners.length,
    before: { status: 'published', startsAt: t07Meta.startsAt.toISOString() },
    after: { status: 'cancelled' },
  })

  // --- Upcoming and later A sessions ----------------------------------------------------
  const pool = [...bookable] // cancelled learners are first: they rebooked elsewhere.
  const sessionForSlot = (slot: SlotPlan) => {
    const trainer = trainerByN.get(slot.trainer) as TrainerSeed
    return sessionIdOf(trainer, slot.kind === 'upcoming' ? 2 : 3)
  }

  const movedSources: {
    enrolment: EnrolmentPlan
    fromSession: string
    toSession: string
    toRsvp: string
    bookedAt: Date
  }[] = []

  for (const slot of A_SLOTS) {
    const sessionId = sessionForSlot(slot)
    const meta = sessionMeta.get(sessionId) as NonNullable<ReturnType<typeof sessionMeta.get>>
    let placed = 0
    for (let i = 0; i < pool.length && placed < slot.confirmed; ) {
      const enrolment = pool[i] as EnrolmentPlan
      if (overlaps(enrolment.learner.n, meta.startsAt, meta.endsAt)) {
        i += 1
        continue
      }
      pool.splice(i, 1)
      const bookedAt = cal.ago(rng.float(0.5, 12))
      addRsvp(enrolment, sessionId, 'confirmed', bookedAt)
      result.upcomingBooked.add(enrolment.id)
      const earliest = result.firstBookedAt.get(enrolment.id)
      if (!earliest || bookedAt < earliest) result.firstBookedAt.set(enrolment.id, bookedAt)
      placed += 1
      // The first learner booked on a few "later" sessions had originally booked the
      // trainer's upcoming session and moved: that earlier booking stays as history.
      if (slot.kind === 'later' && placed === 1 && [2, 4, 10].includes(slot.trainer)) {
        movedSources.push({
          enrolment,
          fromSession: sessionIdOf(trainerByN.get(slot.trainer) as TrainerSeed, 2),
          toSession: sessionId,
          toRsvp: rsvpIdOf(sessionId, enrolment.learner.code),
          bookedAt,
        })
      }
    }
    if (placed !== slot.confirmed) throw new Error(`Not enough eligible learners for ${meta.code}`)

    for (let w = 1; w <= (slot.waitlist ?? 0); w++) {
      const index = pool.findIndex((e) => !overlaps(e.learner.n, meta.startsAt, meta.endsAt))
      const [enrolment] = pool.splice(index, 1)
      if (!enrolment) throw new Error('Not enough learners for the waitlist')
      const bookedAt = cal.ago(rng.float(0.1, 2))
      addRsvp(enrolment, sessionId, 'waitlisted', bookedAt, { waitlistPosition: w })
      result.upcomingBooked.add(enrolment.id)
      result.firstBookedAt.set(enrolment.id, bookedAt)
    }
  }

  for (const moved of movedSources) {
    const bookedAt = new Date(moved.bookedAt.getTime() - rng.int(1, 3) * DAY_MS)
    result.rsvps.push({
      id: rsvpIdOf(moved.fromSession, moved.enrolment.learner.code, ':moved'),
      sessionId: moved.fromSession,
      learnerId: moved.enrolment.learner.userId,
      status: 'moved',
      waitlistPosition: null,
      replacedByRsvpId: moved.toRsvp,
      cancelledReason: 'Moved to a later session by the learner',
      bookedAt,
      createdAt: bookedAt,
      updatedAt: moved.bookedAt,
    })
    const earliest = result.firstBookedAt.get(moved.enrolment.id)
    if (!earliest || bookedAt < earliest) result.firstBookedAt.set(moved.enrolment.id, bookedAt)
  }

  // --- Rescheduled session (T05 later) --------------------------------------------------
  const t05 = trainerByN.get(5) as TrainerSeed
  const t05Id = sessionIdOf(t05, 3)
  const t05Meta = sessionMeta.get(t05Id) as NonNullable<ReturnType<typeof sessionMeta.get>>
  const previousStart = cal.at(t05.laterDay - 2, t05.upcoming.time)
  const previousEnd = new Date(previousStart.getTime() + 60 * 60_000)
  const rescheduleEventId = `evt-reschedule-${t05Meta.code}-1`
  const rescheduleReason =
    'The room was needed for an Academy briefing, so the session moved two days later.'
  const rescheduleAt = cal.ago(2)
  const t05Rsvps = result.rsvps.filter((r) => r.sessionId === t05Id && r.status === 'confirmed')
  result.reschedules.push({
    id: stableUuid('reschedule', rescheduleEventId),
    sessionId: t05Id,
    previousStartsAt: previousStart,
    previousEndsAt: previousEnd,
    newStartsAt: t05Meta.startsAt,
    newEndsAt: t05Meta.endsAt,
    previousVenue: 'Demo Academy Room 1',
    newVenue: 'Demo Academy Room 1',
    reason: rescheduleReason,
    affectedRsvps: t05Rsvps.length,
    eventId: rescheduleEventId,
    changedBy: t05.userId,
    createdAt: rescheduleAt,
    updatedAt: rescheduleAt,
  })
  const enrolmentByUser = new Map(
    plan.enrolments.filter((e) => e.programme === 'A').map((e) => [e.learner.userId, e]),
  )
  for (const rsvp of t05Rsvps) {
    const enrolment = enrolmentByUser.get(rsvp.learnerId) as EnrolmentPlan
    pushNotifications(
      enrolment,
      'session_rescheduled',
      rescheduleEventId,
      t05,
      t05Meta.title,
      {
        'Old date and time': formatQatarDateTime(previousStart),
        'New date and time, Qatar time': formatQatarDateTime(t05Meta.startsAt),
        Format: 'In person',
        'Venue or online details': 'Demo Academy Room 1',
        Reason: rescheduleReason,
      },
      rescheduleAt,
      t05Id,
    )
  }
  result.auditHints.push({
    kind: 'reschedule',
    sessionId: t05Id,
    trainerUserId: t05.userId,
    at: rescheduleAt,
    reason: rescheduleReason,
    affected: t05Rsvps.length,
    before: { startsAt: previousStart.toISOString() },
    after: { startsAt: t05Meta.startsAt.toISOString() },
  })

  // --- Optional B sessions and the C sample ---------------------------------------------
  for (const [trainerN, fill] of Object.entries(OPTIONAL_FILL)) {
    const trainer = trainerByN.get(Number(trainerN)) as TrainerSeed
    const programme = trainer.upcoming.programme
    const eligible = rng
      .fork(`optional-${trainer.code}`)
      .shuffle(
        plan.enrolments.filter(
          (e) =>
            e.programme === programme &&
            (programme === 'B'
              ? ['b_mid', 'b_practice', 'b_response', 'b_review', 'completed'].includes(e.stage)
              : ['c_viewing', 'completed'].includes(e.stage)),
        ),
      )
    const take = (count: number, sessionId: string, mode: 'completed' | 'future') => {
      const meta = sessionMeta.get(sessionId) as NonNullable<ReturnType<typeof sessionMeta.get>>
      let placed = 0
      for (const enrolment of eligible) {
        if (placed >= count) break
        if (overlaps(enrolment.learner.n, meta.startsAt, meta.endsAt)) continue
        if (mode === 'completed') {
          // One completed optional session per enrolment keeps the link map simple.
          if (result.completedLinks.has(enrolment.id)) continue
          const attendanceValue: AttendanceValue =
            placed === count - 1 ? 'absent' : rng.chance(0.1) ? 'late' : 'attended'
          sessionOutcome(
            enrolment,
            sessionId,
            attendanceValue,
            attendanceValue === 'absent' ? null : 'final',
            cal.ago(bookedAgo(meta.startsAt)),
          )
        } else {
          addRsvp(enrolment, sessionId, 'confirmed', cal.ago(rng.float(0.5, 10)))
        }
        placed += 1
      }
      if (placed < count) throw new Error(`Not enough learners for ${meta.code}`)
    }
    take(fill.completed, sessionIdOf(trainer, 1), 'completed')
    take(fill.upcoming, sessionIdOf(trainer, 2), 'future')
    take(fill.later, sessionIdOf(trainer, 3), 'future')
  }

  // The A trainers with no A completed session in `A_COMPLETED_TRAINERS` have none to fill;
  // T07's completed slot is the cancelled one.

  function pushNotifications(
    enrolment: EnrolmentPlan,
    kind: 'session_rescheduled' | 'session_cancelled',
    eventId: string,
    trainer: TrainerSeed,
    sessionTitle: string,
    values: Record<string, string>,
    at: Date,
    sessionId: string,
  ) {
    const template = NOTIFICATION_TEMPLATES[kind]
    const all: Record<string, string> = {
      'Session title': sessionTitle,
      'First name': enrolment.learner.fullName.split(' ')[0] as string,
      Trainer: trainer.fullName,
      ...values,
    }
    const subject = renderTemplate(template.subject, all)
    const body = renderTemplate(template.body, all)
    for (const channel of ['in_app', 'email'] as const) {
      result.notifications.push({
        id: stableUuid('notification', `${eventId}:${enrolment.learner.code}:${channel}`),
        eventId,
        kind,
        recipientId: enrolment.learner.userId,
        channel,
        // Emails are simulated: never recorded as sent (brief §11).
        state: channel === 'email' ? 'simulated' : 'sent',
        subject,
        body,
        sessionId,
        actorId: trainer.userId,
        createdAt: at,
        updatedAt: at,
      })
    }
  }

  return result
}
