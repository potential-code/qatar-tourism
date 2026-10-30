import { beforeEach, describe, expect, test } from 'bun:test'
import { DEMO_PASSWORD } from '@shared/constants'
import type { DemoDb } from '@/mocks/db'
import { decideApproval, getAttentionCounts, listApprovals } from '../approvals.service'
import { markAttendance } from '../attendance.service'
import { signIn } from '../auth.service'
import { listMyRequests, requestEnrolment } from '../programme-enrolment.service'
import { bookSession, cancelBooking, getCatalogue, getMySessions } from '../rsvps.service'
import {
  leaveWaitlist,
  listWaitlist,
  moveWaitlistEntry,
  respondToOffer,
} from '../rsvps-waitlist.service'
import { getUser, listUsers, lockAccount, unlockAccount } from '../users.service'
import { actAs, freshDemo } from './helpers'
import { ADMIN, OMAR, rejection, rsvpsOn, sessionId, T03 } from './sessions-support'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

const FULL = 'SES-T03-2'

/** A confirmed learner on the full session cancels, which opens the first offer. */
async function openFirstOffer() {
  const roster = rsvpsOn(FULL)
  const confirmed = roster.find((r) => r.status === 'confirmed')
  actAs(db, confirmed?.learnerId as string)
  await cancelBooking(confirmed?.id as string)
  return rsvpsOn(FULL).find((r) => r.status === 'offered')
}

const offerOf = (rsvpId: string | undefined) => db.seatOffers.find((o) => o.rsvpId === rsvpId)
const count = (status: string) => rsvpsOn(FULL).filter((r) => r.status === status).length

describe('seat offers', () => {
  test('an offer lasts the configured window and tells the learner once', async () => {
    const offered = await openFirstOffer()
    const offer = offerOf(offered?.id)
    expect(offer?.status).toBe('offered')
    const hours =
      (Date.parse(offer?.expiresAt ?? '') - Date.parse(offer?.offeredAt ?? '')) / 3_600_000
    expect(hours).toBe(db.settings.seatOfferWindowHours)
    expect(hours).toBe(24)
    const told = db.notifications.filter((n) => n.eventId === `evt-seat-offer-${offer?.id}`)
    expect(told.map((n) => n.channel).sort()).toEqual(['email', 'in_app'])
    expect(told.find((n) => n.channel === 'email')?.state).toBe('simulated')
  })

  test('a reserved seat cannot be booked by someone else', async () => {
    await openFirstOffer()
    expect(count('confirmed')).toBe(19)
    expect(count('offered')).toBe(1)
    actAs(db, OMAR)
    const refused = await rejection(bookSession({ sessionId: sessionId(FULL) }))
    expect(refused.code).toBe('SESSION_FULL')
    const catalogue = await getCatalogue()
    const card = catalogue.items.find((s) => s.code === FULL)
    expect(card?.seatsRemaining).toBe(0)
    expect(card?.eligibility.state).toBe('waitlist')
    expect(db.sessions.find((s) => s.code === FULL)?.status).toBe('full')
  })

  test('accepting moves the learner to Confirmed and notifies them', async () => {
    const offered = await openFirstOffer()
    actAs(db, offered?.learnerId as string)
    const mine = await getMySessions()
    const booking = mine.items.find((i) => i.rsvpId === offered?.id)
    expect(booking?.status).toBe('offered')
    expect(booking?.offer?.expiresAt).toBe(offerOf(offered?.id)?.expiresAt)

    await respondToOffer(offered?.id as string, 'accept')
    expect(count('confirmed')).toBe(20)
    expect(count('offered')).toBe(0)
    expect(offerOf(offered?.id)?.status).toBe('accepted')
    expect(
      db.notifications.some(
        (n) => n.kind === 'seat_offer_accepted' && n.recipientId === offered?.learnerId,
      ),
    ).toBe(true)
    // A second answer is refused.
    expect((await rejection(respondToOffer(offered?.id as string, 'accept'))).code).toBe(
      'OFFER_NOT_OPEN',
    )
  })

  test('declining offers the seat to the next eligible learner', async () => {
    const offered = await openFirstOffer()
    actAs(db, offered?.learnerId as string)
    await respondToOffer(offered?.id as string, 'decline')
    expect(db.rsvps.find((r) => r.id === offered?.id)?.status).toBe('cancelled')
    const next = rsvpsOn(FULL).find((r) => r.status === 'offered')
    expect(next).toBeTruthy()
    expect(next?.id).not.toBe(offered?.id)
    expect(offerOf(offered?.id)?.status).toBe('declined')
    expect(count('confirmed')).toBe(19)
  })

  test('an offer past its window expires against the demo clock and passes on', async () => {
    const offered = await openFirstOffer()
    // The presenter advances the demo clock two days.
    db.meta.clockOffsetDays = 2
    actAs(db, OMAR)
    await getMySessions()
    expect(offerOf(offered?.id)?.status).toBe('expired')
    expect(db.rsvps.find((r) => r.id === offered?.id)?.status).toBe('cancelled')
    const expiredNote = db.notifications.filter(
      (n) => n.kind === 'seat_offer_expired' && n.recipientId === offered?.learnerId,
    )
    expect(expiredNote).toHaveLength(2)
    const next = rsvpsOn(FULL).find((r) => r.status === 'offered')
    expect(next?.id).not.toBe(offered?.id)
    expect(offerOf(next?.id)?.status).toBe('offered')
    // Settling again creates nothing new.
    await getMySessions()
    expect(
      db.notifications.filter(
        (n) => n.kind === 'seat_offer_expired' && n.recipientId === offered?.learnerId,
      ),
    ).toHaveLength(2)
  })

  test('a late acceptance after expiry is refused', async () => {
    const offered = await openFirstOffer()
    db.meta.clockOffsetDays = 2
    actAs(db, offered?.learnerId as string)
    expect((await rejection(respondToOffer(offered?.id as string, 'accept'))).code).toBe(
      'OFFER_NOT_OPEN',
    )
    expect(count('confirmed')).toBe(19)
  })

  test('a learner who cannot take the seat is skipped without losing their place', async () => {
    const first = rsvpsOn(FULL).find((r) => r.status === 'waitlisted' && r.waitlistPosition === 1)
    const profile = db.profiles.find((p) => p.userId === first?.learnerId)
    if (profile) profile.accountStatus = 'locked'
    const offered = await openFirstOffer()
    expect(offered?.id).not.toBe(first?.id)
    expect(db.rsvps.find((r) => r.id === first?.id)?.status).toBe('waitlisted')
  })

  test('waitlisted and offered learners are never marked attending', async () => {
    const offered = await openFirstOffer()
    const waitlisted = rsvpsOn(FULL).find((r) => r.status === 'waitlisted')
    actAs(db, ADMIN)
    for (const rsvp of [offered, waitlisted]) {
      const refused = await rejection(
        markAttendance({ rsvpId: rsvp?.id as string, status: 'attended' }),
      )
      expect(refused.code).toBe('NOT_CONFIRMED')
    }
    expect(
      db.attendance.filter(
        (a) =>
          a.sessionId === sessionId(FULL) &&
          ['waitlisted', 'offered'].includes(db.rsvps.find((r) => r.id === a.rsvpId)?.status ?? ''),
      ),
    ).toHaveLength(0)
  })

  test('leaving the waitlist renumbers the queue', async () => {
    const second = rsvpsOn(FULL).find((r) => r.status === 'waitlisted' && r.waitlistPosition === 2)
    actAs(db, second?.learnerId as string)
    await leaveWaitlist(second?.id as string)
    const queue = rsvpsOn(FULL).filter((r) => r.status === 'waitlisted')
    expect(queue.map((r) => r.waitlistPosition)).toEqual([1, 2])
  })

  test('only admins override waitlist priority, with a reason, and it is audited', async () => {
    const second = rsvpsOn(FULL).find((r) => r.status === 'waitlisted' && r.waitlistPosition === 2)
    actAs(db, T03)
    expect(
      (
        await rejection(
          moveWaitlistEntry(second?.id as string, { direction: 'up', reason: 'Trainer asks' }),
        )
      ).status,
    ).toBe(403)
    actAs(db, ADMIN)
    expect(
      (await rejection(moveWaitlistEntry(second?.id as string, { direction: 'up', reason: '' })))
        .status,
    ).toBe(400)
    await moveWaitlistEntry(second?.id as string, { direction: 'up', reason: 'Accessibility need' })
    expect(db.rsvps.find((r) => r.id === second?.id)?.waitlistPosition).toBe(1)
    const event = db.auditEvents.find((e) => e.action === 'waitlist.override_priority')
    expect(event?.reason).toBe('Accessibility need')
  })
})

describe('approvals', () => {
  const pendingFullSessionRequest = () => {
    const request = db.approvalRequests.find((r) => r.sessionId === sessionId(FULL))
    if (!request) throw new Error('Seeded request for the full session is missing')
    return request
  }

  test('approving an enrolment for a full session never bypasses capacity', async () => {
    const request = pendingFullSessionRequest()
    actAs(db, ADMIN)
    const res = await decideApproval(request.code, { decision: 'approve' })
    expect(res.status).toBe('approved')
    // Approval comes first: the learner is enrolled in Program A ...
    const programmeA = db.programmes.find((p) => p.code === 'A')
    expect(
      db.enrolments.some(
        (e) => e.learnerId === request.learnerId && e.programmeId === programmeA?.id,
      ),
    ).toBe(true)
    // ... but never gets a confirmed seat on the full session.
    expect(res.booking).not.toBe('confirmed')
    expect(count('confirmed')).toBe(20)
    expect(
      db.rsvps.some(
        (r) =>
          r.learnerId === request.learnerId &&
          r.sessionId === sessionId(FULL) &&
          r.status === 'confirmed',
      ),
    ).toBe(false)
    const audit = db.auditEvents.find(
      (e) => e.action === 'approval.approve' && e.objectId === request.code,
    )
    expect(audit?.actorId).toBe(ADMIN)
  })

  test('rejecting needs a reason; the learner sees status, reason and next step', async () => {
    const request = pendingFullSessionRequest()
    actAs(db, ADMIN)
    expect((await rejection(decideApproval(request.code, { decision: 'reject' }))).status).toBe(400)
    expect(request.status).toBe('pending')
    await decideApproval(request.code, {
      decision: 'reject',
      reason: 'Manager confirmation missing',
    })
    expect(request.status).toBe('rejected')
    expect(request.decidedBy).toBe(ADMIN)
    const audit = db.auditEvents.find(
      (e) => e.action === 'approval.reject' && e.objectId === request.code,
    )
    expect(audit?.reason).toBe('Manager confirmation missing')

    actAs(db, request.learnerId)
    const mine = await listMyRequests()
    const row = mine.items.find((i) => i.code === request.code)
    expect(row?.status).toBe('rejected')
    expect(row?.reason).toBe('Manager confirmation missing')
    expect(row?.nextStep.length).toBeGreaterThan(0)
    // A decided request cannot be decided again.
    actAs(db, ADMIN)
    expect((await rejection(decideApproval(request.code, { decision: 'approve' }))).code).toBe(
      'ALREADY_DECIDED',
    )
  })

  test('external certificate decisions update the certificate and credit CPD only once', async () => {
    const request = db.approvalRequests.find((r) => r.type === 'external_certificate')
    const cert = db.externalCertificates.find((c) => c.id === request?.externalCertificateId)
    actAs(db, ADMIN)
    await decideApproval(request?.code as string, { decision: 'approve', recognisedAmount: 1 })
    expect(cert?.status).toBe('verified')
    expect(cert?.recognisedAmount).toBe(1)
    const lines = db.cpdLedger.filter((l) => l.externalCertificateId === cert?.id)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.status).toBe('approved')
  })

  test('a learner requests enrolment, and trainers cannot review', async () => {
    const learner = db.approvalRequests.find((r) => r.status === 'rejected')?.learnerId as string
    actAs(db, learner)
    const made = await requestEnrolment('A', { note: 'Manager has nominated me' })
    expect(made.status).toBe('pending')
    expect((await rejection(requestEnrolment('A'))).code).toBe('REQUEST_OPEN')
    actAs(db, T03)
    expect((await rejection(decideApproval(made.code, { decision: 'approve' }))).status).toBe(403)
    expect((await rejection(listApprovals())).status).toBe(403)
  })
})

describe('account lock and unlock', () => {
  const emailOf = (id: string) => db.users.find((u) => u.id === id)?.email as string

  test('locking blocks sign-in, ends the session and keeps every record; unlock restores access', async () => {
    const before = {
      enrolments: db.enrolments.filter((e) => e.learnerId === OMAR).map((e) => e.progressPercent),
      bookings: db.rsvps.filter((r) => r.learnerId === OMAR).length,
      attempts: db.assessmentAttempts.filter((a) => a.learnerId === OMAR).length,
      certificates: db.certificates.filter((c) => c.learnerId === OMAR).length,
    }
    actAs(db, OMAR)
    expect(db.session?.userId).toBe(OMAR)
    actAs(db, ADMIN)
    await lockAccount(OMAR, 'Suspected shared credentials (simulated)')
    const profile = db.profiles.find((p) => p.userId === OMAR)
    expect(profile?.accountStatus).toBe('locked')
    expect(profile?.lockedBy).toBe(ADMIN)

    const refused = await rejection(signIn(emailOf(OMAR), DEMO_PASSWORD))
    expect(refused.code).toBe('ACCOUNT_LOCKED')
    expect(refused.message).toBe('This account is locked. Contact Academy support.')

    expect(db.enrolments.filter((e) => e.learnerId === OMAR).map((e) => e.progressPercent)).toEqual(
      before.enrolments,
    )
    expect(db.rsvps.filter((r) => r.learnerId === OMAR)).toHaveLength(before.bookings)
    expect(db.assessmentAttempts.filter((a) => a.learnerId === OMAR)).toHaveLength(before.attempts)
    expect(db.certificates.filter((c) => c.learnerId === OMAR)).toHaveLength(before.certificates)
    const detail = await getUser(OMAR)
    expect(detail.profile?.accountStatus).toBe('locked')

    await unlockAccount(OMAR, 'Identity confirmed with the learner')
    expect(db.profiles.find((p) => p.userId === OMAR)?.accountStatus).toBe('active')
    expect(db.profiles.find((p) => p.userId === OMAR)?.lockReason).toBeNull()
    expect((await signIn(emailOf(OMAR), DEMO_PASSWORD)).user.id).toBe(OMAR)
    expect(db.enrolments.filter((e) => e.learnerId === OMAR).map((e) => e.progressPercent)).toEqual(
      before.enrolments,
    )
    const actions = db.auditEvents.filter((e) => e.objectId === OMAR).map((e) => e.action)
    expect(actions).toContain('account.lock')
    expect(actions).toContain('account.unlock')
  })

  test('a reason is mandatory and trainers cannot lock or unlock', async () => {
    actAs(db, ADMIN)
    expect((await rejection(lockAccount(OMAR, ''))).status).toBe(400)
    actAs(db, T03)
    expect((await rejection(lockAccount(OMAR, 'Trainer concern about behaviour'))).status).toBe(403)
    expect((await rejection(unlockAccount(OMAR, 'Trainer unlock attempt'))).status).toBe(403)
    expect(db.profiles.find((p) => p.userId === OMAR)?.accountStatus).toBe('active')
  })

  test('the seeded locked learner shows in the Locked status filter', async () => {
    actAs(db, ADMIN)
    const locked = await listUsers({ status: 'locked' })
    expect(locked.total).toBe(1)
  })
})

describe('dashboard counts', () => {
  test('each count equals the length of the list it opens, before and after changes', async () => {
    actAs(db, ADMIN)
    const reconcile = async () => {
      const counts = await getAttentionCounts()
      const pending = await listApprovals({ status: 'pending' })
      const waitlist = await listWaitlist()
      const locked = await listUsers({ status: 'locked' })
      expect(counts.pendingApprovals).toBe(pending.items.length)
      expect(counts.waitlistedLearners).toBe(waitlist.learners)
      expect(counts.lockedAccounts).toBe(locked.total)
      return counts
    }
    const start = await reconcile()
    expect(start).toEqual({ pendingApprovals: 5, waitlistedLearners: 3, lockedAccounts: 1 })

    await lockAccount(OMAR, 'Counts check (simulated)')
    const request = db.approvalRequests.find((r) => r.status === 'pending')
    await decideApproval(request?.code as string, {
      decision: 'reject',
      reason: 'Not eligible yet',
    })
    const next = await reconcile()
    expect(next.lockedAccounts).toBe(2)
    expect(next.pendingApprovals).toBe(4)
  })
})
