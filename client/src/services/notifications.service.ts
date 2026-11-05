import { PROGRAMME_CODES, type ProgrammeCode } from '@shared/constants'
import type { NotificationLogFilter } from '@shared/schemas/trainer-ops'
import type { NotificationRow } from '@shared/types/db'
import { z } from 'zod'
import {
  commit,
  currentScope,
  db,
  delay,
  indexBy,
  insertRow,
  nowIso,
  out,
  parseInput,
  requireRole,
  requireUser,
  updateRow,
} from './api'

/**
 * In-app notifications and SIMULATED demo emails (brief §10–11). Shared seam: services call
 * `notify` / `notifyEach` next to the change that triggers a message.
 */

export type NotifyInput = {
  /** Same id for every notification one event creates; the (event, recipient, channel) dedupe key. */
  eventId: string
  kind: string
  recipientIds: string[]
  subject: string
  body: string
  sessionId?: string | null
  actorId?: string | null
}

const CHANNELS = ['in_app', 'email'] as const

const dedupeKey = (row: Pick<NotificationRow, 'eventId' | 'recipientId' | 'channel'>) =>
  `${row.eventId}|${row.recipientId}|${row.channel}`

/**
 * Creates one in-app notification and one simulated email per recipient. In-app messages are
 * delivered by this system, so they are `sent`; emails stay `simulated` (never described as
 * delivered). Retrying with the same `eventId` creates nothing new, so actions can be retried
 * safely. Returns how many rows were created. Synchronous; the caller commits.
 */
export function notify(input: NotifyInput): number {
  if (input.recipientIds.length === 0) return 0
  const existing = new Set(
    db.notifications.filter((n) => n.eventId === input.eventId).map(dedupeKey),
  )
  let created = 0
  for (const recipientId of input.recipientIds) {
    for (const channel of CHANNELS) {
      const key = dedupeKey({ eventId: input.eventId, recipientId, channel })
      if (existing.has(key)) continue
      existing.add(key)
      insertRow('notifications', {
        eventId: input.eventId,
        kind: input.kind,
        recipientId,
        channel,
        state: channel === 'in_app' ? 'sent' : 'simulated',
        subject: input.subject,
        body: input.body,
        sessionId: input.sessionId ?? null,
        actorId: input.actorId ?? null,
      })
      created += 1
    }
  }
  return created
}

/**
 * Personalised variant: one message per recipient (merge fields such as the first name differ).
 * Same dedupe guarantees as `notify`. Returns the number of recipients newly notified.
 */
export function notifyEach(
  base: Omit<NotifyInput, 'recipientIds' | 'subject' | 'body'>,
  messages: { recipientId: string; subject: string; body: string }[],
): number {
  let created = 0
  for (const message of messages) {
    const rows = notify({
      ...base,
      recipientIds: [message.recipientId],
      subject: message.subject,
      body: message.body,
    })
    if (rows > 0) created += 1
  }
  return created
}

const newestFirst = (a: NotificationRow, b: NotificationRow) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)

/** Assignment events carry the submission id: `evt-return-<id>`, `evt-review-<id>`, ... */
const SUBMISSION_EVENT =
  /^evt-(?:return|review|correct|submitted)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/

const bellOptions = z.object({
  programme: z.enum(PROGRAMME_CODES).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

export type BellOptions = { programme?: ProgrammeCode; limit?: number }

/**
 * The programme a notification belongs to: its session's programme, or the programme of the
 * submission an assignment event names. `null` when nothing links it to a programme (account,
 * approval and credential messages), and those show in every programme.
 */
function programmeLookup() {
  const codes = new Map(db.programmes.map((p) => [p.id, p.code]))
  const sessions = indexBy(db.sessions, (s) => s.id)
  const enrolments = indexBy(db.enrolments, (e) => e.id)
  const submissions = indexBy(db.submissions, (s) => s.id)
  return (n: NotificationRow): ProgrammeCode | null => {
    if (n.sessionId) {
      const session = sessions.get(n.sessionId)
      return session ? (codes.get(session.programmeId) ?? null) : null
    }
    const submissionId = SUBMISSION_EVENT.exec(n.eventId)?.[1]
    const submission = submissionId ? submissions.get(submissionId) : undefined
    const enrolment = submission ? enrolments.get(submission.enrolmentId) : undefined
    return enrolment ? (codes.get(enrolment.programmeId) ?? null) : null
  }
}

/** Keeps rows of `programme` and rows linked to no programme; everything when none is given. */
function inProgramme(programme?: ProgrammeCode): (n: NotificationRow) => boolean {
  if (!programme) return () => true
  const programmeOf = programmeLookup()
  return (n) => {
    const code = programmeOf(n)
    return code === null || code === programme
  }
}

/**
 * The bell: the signed-in user's own in-app notifications, newest first, and the unread count.
 * A learner's bell passes the active programme so a learner in A and B sees only that
 * programme's session and assignment messages.
 */
export async function listMine(options: BellOptions = {}) {
  await delay()
  const user = requireUser()
  const { programme, limit = 20 } = parseInput(bellOptions, options, 'query')
  const shown = inProgramme(programme)
  const mine = db.notifications.filter(
    (n) => n.recipientId === user.id && n.channel === 'in_app' && shown(n),
  )
  const items = [...mine]
    .sort(newestFirst)
    .slice(0, limit)
    .map((n) => ({
      id: n.id,
      eventId: n.eventId,
      kind: n.kind,
      subject: n.subject,
      body: n.body,
      state: n.state,
      sessionId: n.sessionId,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }))
  return out({ unread: mine.filter((n) => n.readAt === null).length, items })
}

/**
 * Marks the user's own notifications read: the given ids, or all when none are given. With a
 * programme, "all" means all the bell shows for that programme.
 */
export async function markRead(ids?: string[], options: Pick<BellOptions, 'programme'> = {}) {
  await delay(120)
  const user = requireUser()
  const { programme } = parseInput(bellOptions, options, 'query')
  const wanted = ids && ids.length > 0 ? new Set(ids) : null
  const shown = inProgramme(programme)
  const readAt = nowIso()
  let updated = 0
  for (const n of db.notifications) {
    if (n.recipientId !== user.id || n.readAt !== null) continue
    if (wanted && !wanted.has(n.id)) continue
    if (!wanted && !shown(n)) continue
    updateRow(n, { readAt })
    updated += 1
  }
  if (updated > 0) commit()
  return { updated }
}

/**
 * Notification log (brief §11): both channels of session notifications with their delivery
 * state. A trainer sees their own sessions only; an admin sees all. Recipients are shown by
 * learner ID and permitted display name, never by email address.
 */
export async function listLog(filter: NotificationLogFilter = {}, limit = 200) {
  await delay()
  requireRole('trainer', 'admin')
  const scope = currentScope()
  const trainerId = scope.kind === 'trainer' ? scope.trainerId : null
  const sessions = indexBy(db.sessions, (s) => s.id)
  const users = indexBy(db.users, (u) => u.id)
  const profiles = indexBy(db.profiles, (p) => p.userId)

  const items = db.notifications.flatMap((n) => {
    const session = n.sessionId ? sessions.get(n.sessionId) : undefined
    const recipient = users.get(n.recipientId)
    if (!session || !recipient) return []
    if (trainerId && session.trainerId !== trainerId) return []
    if (filter.sessionId && n.sessionId !== filter.sessionId) return []
    if (filter.eventId && n.eventId !== filter.eventId) return []
    if (filter.channel && n.channel !== filter.channel) return []
    return [
      {
        id: n.id,
        eventId: n.eventId,
        kind: n.kind,
        channel: n.channel,
        state: n.state,
        subject: n.subject,
        body: n.body,
        createdAt: n.createdAt,
        readAt: n.readAt,
        sessionId: session.id,
        sessionCode: session.code,
        sessionTitle: session.title,
        learnerCode: profiles.get(n.recipientId)?.learnerCode ?? 'Unknown',
        recipientName: recipient.name,
      },
    ]
  })
  items.sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) ||
      a.eventId.localeCompare(b.eventId) ||
      a.learnerCode.localeCompare(b.learnerCode),
  )
  return out({ items: items.slice(0, limit) })
}
