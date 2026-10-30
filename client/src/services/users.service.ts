import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'
import {
  type AdminUserCreateInput,
  type AdminUserListQuery,
  adminEnrolInput,
  adminReasonInput,
  adminRoleInput,
  adminUserCreateInput,
  adminUserListQuery,
  adminUserUpdateInput,
  userIdParam,
} from '@shared/schemas/admin-users'
import type { UserRow } from '@shared/types/db'
import { accountStatusOf, learnerDisplayId } from '@shared/utils/identity'
import type { z } from 'zod'
import {
  ApiError,
  commit,
  db,
  delay,
  findOr404,
  indexBy,
  insertRow,
  newId,
  nowIso,
  out,
  parseInput,
  requireCapability,
  requireRole,
  updateRow,
} from './api'
import { recordAudit } from './audit.service'
import { createEnrolment, enrolmentOf } from './enrolment/core'
import { notify } from './notifications.service'
import { nextLearnerCode } from './profiles/learner-code'
import { type AccountStatus, loadUserDetail } from './users/detail'
import { buildTimeline } from './users/timeline'

/**
 * Academy user management (brief §14 User management, §11 "Manage permissions"), formerly
 * server/modules/users. Admin only (users.policy): every function starts with
 * `requireRole('admin')`. Every change is audited with its reason.
 */

export type { AccountStatus } from './users/detail'
export type { TimelineEntry } from './users/timeline'

type Admin = UserRow

const actorOf = (admin: Admin) => ({ id: admin.id, role: admin.role, name: admin.name })

const ROLE_ORDER: Record<Role, number> = { learner: 0, trainer: 1, admin: 2 }

// ---------------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------------

/** Users matching the filters, learners by code first, then trainers and administrators. */
export async function listUsers(query: Partial<z.input<typeof adminUserListQuery>> = {}) {
  await delay()
  requireRole('admin')
  const q: AdminUserListQuery = parseInput(adminUserListQuery, query, 'query')
  const profiles = indexBy(db.profiles, (p) => p.userId)
  const organisations = indexBy(db.organisations, (o) => o.id)
  const programmes = indexBy(db.programmes, (p) => p.id)
  const enrolled = new Map<string, ProgrammeCode[]>()
  for (const e of db.enrolments) {
    const code = programmes.get(e.programmeId)?.code
    if (!code) continue
    enrolled.set(e.learnerId, [...(enrolled.get(e.learnerId) ?? []), code])
  }
  const term = q.search?.toLowerCase()

  const rows = db.users.flatMap((user) => {
    const profile = profiles.get(user.id)
    const status: AccountStatus = profile?.suspended
      ? 'suspended'
      : profile && accountStatusOf(profile) === 'locked'
        ? 'locked'
        : user.emailVerified
          ? 'active'
          : 'invited'
    const codes = [...(enrolled.get(user.id) ?? [])].sort()
    if (q.role && user.role !== q.role) return []
    if (q.status && status !== q.status) return []
    if (q.programme && !codes.includes(q.programme)) return []
    if (
      term &&
      !user.name.toLowerCase().includes(term) &&
      !user.email.toLowerCase().includes(term) &&
      !profile?.learnerCode.toLowerCase().includes(term)
    ) {
      return []
    }
    const organisation = profile?.organisationId
      ? organisations.get(profile.organisationId)
      : undefined
    return [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        learnerCode: profile?.learnerCode ?? null,
        learnerDisplayId: profile ? learnerDisplayId(profile.learnerCode) : null,
        organisation: organisation?.name ?? null,
        jobTitle: profile?.jobTitle ?? null,
        lastActivityAt: profile?.lastActivityAt ?? null,
        status,
        programmes: codes as string[],
      },
    ]
  })
  rows.sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      // Postgres sorts nulls last in ascending order.
      (a.learnerCode ?? '￿').localeCompare(b.learnerCode ?? '￿') ||
      a.name.localeCompare(b.name),
  )
  const start = (q.page - 1) * q.pageSize
  return out({
    items: rows.slice(start, start + q.pageSize),
    total: rows.length,
    page: q.page,
    pageSize: q.pageSize,
  })
}

export type UserListItem = Awaited<ReturnType<typeof listUsers>>['items'][number]

/** Organisations and programmes for the user forms and filters. */
export async function listOptions() {
  await delay()
  requireRole('admin')
  return out({
    organisations: db.organisations
      .map((o) => ({ id: o.id, name: o.name, type: o.type }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    programmes: db.programmes
      .map((p) => ({ code: p.code, title: p.title, status: p.status }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  })
}

function findUser(userId: string): UserRow {
  const { userId: id } = parseInput(userIdParam, { userId }, 'param')
  return findOr404(db.users, (u) => u.id === id, 'User not found')
}

/** Learner detail for user management and the report drill-down. */
export async function getUser(userId: string) {
  await delay()
  requireRole('admin')
  const detail = loadUserDetail(findUser(userId))
  return out({
    account: detail.account,
    profile: detail.profile,
    enrolments: detail.enrolments,
    assessments: detail.assessments,
    bookings: detail.bookings,
    submissions: detail.submissions,
    certificates: detail.certificates,
    timeline: buildTimeline(detail),
  })
}

export type UserDetail = Awaited<ReturnType<typeof getUser>>

// ---------------------------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------------------------

function completenessOf(input: Partial<AdminUserCreateInput>) {
  const fields = [
    input.organisationId,
    input.jobTitle,
    input.jobFunction,
    input.seniority,
    input.experience,
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

function assertOrganisation(organisationId: string | null | undefined) {
  if (organisationId && !db.organisations.some((o) => o.id === organisationId)) {
    throw ApiError.badRequest('Choose an organisation from the list')
  }
}

/**
 * Checks an administrator enrolment without writing (same rules as self-enrolment: only a
 * published programme takes new learners), and returns the function that performs it.
 */
function checkEnrolment(userId: string, programme: ProgrammeCode, hasProfile: boolean) {
  const prog = findOr404(db.programmes, (p) => p.code === programme, 'Programme not found')
  if (prog.status !== 'published') {
    throw new ApiError(409, 'PROGRAMME_CLOSED', `Program ${programme} is not open for enrolment`)
  }
  if (enrolmentOf(userId, programme)) {
    throw new ApiError(
      409,
      'ALREADY_ENROLLED',
      `This learner is already enrolled in Program ${programme}`,
    )
  }
  if (!hasProfile) throw ApiError.badRequest('Only learner accounts with a profile can be enrolled')
  return () => {
    const { row, path } = createEnrolment(userId, programme)
    return { enrolmentId: row.id, reason: path.reason, pathCode: path.pathCode }
  }
}

/** The demo invitation: one in-app notice and one SIMULATED email. Never duplicated. */
function invite(admin: Admin, userId: string, name: string): number {
  const first = name.split(' ')[0] ?? name
  return notify({
    eventId: `invite:${userId}`,
    kind: 'user_invited',
    recipientIds: [userId],
    subject: 'You are invited to the Qatar Tourism Academy',
    body: `Hello ${first}, an Academy administrator has created your account. Use the link in this demo message to set your password and complete your profile. This is a demonstration email in the notification log; no external email was sent.`,
    actorId: admin.id,
  })
}

/** Adds a fictional learner (unverified until the invitation is used), optionally invited and enrolled. */
export async function createLearner(input: z.input<typeof adminUserCreateInput>) {
  await delay()
  const admin = requireRole('admin')
  const parsed = parseInput(adminUserCreateInput, input)
  if (db.users.some((u) => u.email.toLowerCase() === parsed.email)) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists')
  }
  assertOrganisation(parsed.organisationId)
  const userId = newId('user')
  const doEnrol = parsed.programme ? checkEnrolment(userId, parsed.programme, true) : null

  const at = nowIso()
  const learnerCode = nextLearnerCode()
  const completeness = completenessOf(parsed)
  // No password and not verified: the invitation is how the learner finishes sign-up.
  insertRow('users', {
    id: userId,
    name: parsed.name,
    email: parsed.email,
    emailVerified: false,
    image: null,
    role: 'learner',
  })
  insertRow('profiles', {
    userId,
    learnerCode,
    fullName: parsed.name,
    organisationId: parsed.organisationId,
    jobTitle: parsed.jobTitle,
    jobFunction: parsed.jobFunction,
    seniority: parsed.seniority,
    experience: parsed.experience,
    status: completeness === 100 ? 'complete' : 'draft',
    wizardStep: completeness === 100 ? 3 : 1,
    completeness,
    registeredAt: at,
  })
  recordAudit(actorOf(admin), {
    action: 'user.create',
    objectType: 'user',
    objectId: userId,
    after: { learnerCode, role: 'learner', organisationId: parsed.organisationId },
    reason: 'Fictional learner added by an administrator',
  })
  let invitationsCreated = 0
  if (parsed.invite) {
    invitationsCreated = invite(admin, userId, parsed.name)
    recordAudit(actorOf(admin), {
      action: 'user.invite',
      objectType: 'user',
      objectId: userId,
      after: { channel: 'demo email and in-app', state: 'simulated' },
    })
  }
  let enrolment: ReturnType<NonNullable<typeof doEnrol>> | null = null
  if (doEnrol && parsed.programme) {
    enrolment = doEnrol()
    recordAudit(actorOf(admin), {
      action: 'enrolment.create',
      objectType: 'enrolment',
      objectId: enrolment.enrolmentId,
      after: { learnerCode, programme: parsed.programme, path: enrolment.pathCode },
      reason: enrolment.reason,
    })
  }
  commit()
  return out({ userId, learnerCode, invitationsCreated, enrolment })
}

/** Edits a learner's name and work details. Audits only the fields that changed. */
export async function updateLearner(userId: string, input: z.input<typeof adminUserUpdateInput>) {
  await delay()
  const admin = requireRole('admin')
  const account = findUser(userId)
  const parsed = parseInput(adminUserUpdateInput, input)
  const before = db.profiles.find((p) => p.userId === account.id)
  if (!before) throw ApiError.badRequest('Only learner profiles can be edited here')
  assertOrganisation(parsed.organisationId)

  const snapshot: Record<string, unknown> = { ...before, name: before.fullName }
  const changed = Object.keys(parsed).filter(
    (key) => (parsed as Record<string, unknown>)[key] !== snapshot[key],
  )
  const merged = {
    organisationId:
      parsed.organisationId !== undefined ? parsed.organisationId : before.organisationId,
    jobTitle: parsed.jobTitle !== undefined ? parsed.jobTitle : before.jobTitle,
    jobFunction: parsed.jobFunction !== undefined ? parsed.jobFunction : before.jobFunction,
    seniority: parsed.seniority !== undefined ? parsed.seniority : before.seniority,
    experience: parsed.experience !== undefined ? parsed.experience : before.experience,
  }
  updateRow(before, {
    ...merged,
    fullName: parsed.name ?? before.fullName,
    completeness: Math.max(before.completeness, completenessOf(merged)),
  })
  if (parsed.name) updateRow(account, { name: parsed.name })

  const pick = (source: Record<string, unknown>) =>
    Object.fromEntries(changed.map((key) => [key, source[key] ?? null]))
  recordAudit(actorOf(admin), {
    action: 'user.update',
    objectType: 'user',
    objectId: account.id,
    before: pick(snapshot),
    after: pick(parsed as Record<string, unknown>),
  })
  commit()
  return { updated: changed }
}

/** Re-sends the demo invitation; an invitation already in the log is not duplicated. */
export async function resendInvite(userId: string) {
  await delay()
  const admin = requireRole('admin')
  const account = findUser(userId)
  if (account.role !== 'learner') throw ApiError.badRequest('Only learners are invited from here')
  const created = invite(admin, account.id, account.name)
  recordAudit(actorOf(admin), {
    action: 'user.invite',
    objectType: 'user',
    objectId: account.id,
    after: { state: 'simulated', created },
    reason: created === 0 ? 'Invitation already in the demo log; no duplicate created' : null,
  })
  commit()
  return { created }
}

/** Enrols a learner on a programme on the rule-matched path. 409 when already enrolled. */
export async function enrolLearner(userId: string, programme: ProgrammeCode) {
  await delay()
  const admin = requireRole('admin')
  const account = findUser(userId)
  const parsed = parseInput(adminEnrolInput, { programme })
  const hasProfile = db.profiles.some((p) => p.userId === account.id)
  const result = checkEnrolment(account.id, parsed.programme, hasProfile)()
  recordAudit(actorOf(admin), {
    action: 'enrolment.create',
    objectType: 'enrolment',
    objectId: result.enrolmentId,
    after: { userId: account.id, programme: parsed.programme, path: result.pathCode },
    reason: result.reason,
  })
  commit()
  return out(result)
}

/** Ends the target's demo session if it is the one open in this browser. Returns the count. */
function revokeSessions(userId: string): number {
  if (db.session?.userId !== userId) return 0
  db.session = null
  return 1
}

async function setSuspended(userId: string, suspended: boolean, reasonInput: string) {
  await delay()
  const admin = requireRole('admin')
  const account = findUser(userId)
  const { reason } = parseInput(adminReasonInput, { reason: reasonInput })
  if (account.id === admin.id) throw ApiError.badRequest('You cannot suspend your own account')
  if (account.role === 'admin') {
    throw ApiError.badRequest('Administrator accounts cannot be suspended here')
  }
  const profile = db.profiles.find((p) => p.userId === account.id)
  if (!profile) throw ApiError.badRequest('Only learner accounts can be suspended here')
  if (profile.suspended === suspended) {
    throw ApiError.badRequest(
      suspended ? 'The account is already suspended' : 'The account is already active',
    )
  }
  const wasSuspended = profile.suspended
  // Keep the 29 Oct accountStatus in step: suspending disables, reactivating makes it active.
  updateRow(profile, {
    suspended,
    accountStatus: suspended ? 'disabled' : 'active',
    ...(suspended ? {} : { lockReason: null, lockedAt: null, lockedBy: null }),
  })
  // Suspension takes effect at once: a live session is ended.
  const sessionsRevoked = suspended ? revokeSessions(account.id) : 0
  recordAudit(actorOf(admin), {
    action: suspended ? 'user.suspend' : 'user.reactivate',
    objectType: 'user',
    objectId: account.id,
    before: { suspended: wasSuspended },
    after: { suspended, sessionsRevoked },
    reason,
  })
  commit()
  return { suspended, sessionsRevoked }
}

/** Suspends a learner or trainer with a reason; they cannot sign in until reactivated. */
export const suspendUser = (userId: string, reason: string) => setSuspended(userId, true, reason)

/** Reactivates a suspended account with a reason. */
export const reactivateUser = (userId: string, reason: string) =>
  setSuspended(userId, false, reason)

async function setLocked(userId: string, locked: boolean, reasonInput: string) {
  await delay()
  // Authorised administrators only (permission `account.lock`); trainers and learners get 403.
  const admin = requireCapability('account.lock')
  const account = findUser(userId)
  const { reason } = parseInput(adminReasonInput, { reason: reasonInput })
  const profile = db.profiles.find((p) => p.userId === account.id)
  if (!profile || account.role !== 'learner') {
    throw ApiError.badRequest('Only learner accounts can be locked or unlocked here')
  }
  const current = accountStatusOf(profile)
  if (current === 'disabled') {
    throw ApiError.conflict(
      'ACCOUNT_DISABLED',
      'This account is disabled. Reactivate it before locking or unlocking.',
    )
  }
  if ((current === 'locked') === locked) {
    throw ApiError.conflict(
      locked ? 'ALREADY_LOCKED' : 'NOT_LOCKED',
      locked ? 'The account is already locked' : 'The account is not locked',
    )
  }
  // Only the account status changes: history, results, credentials and progress are untouched.
  updateRow(
    profile,
    locked
      ? { accountStatus: 'locked', lockReason: reason, lockedAt: nowIso(), lockedBy: admin.id }
      : { accountStatus: 'active', lockReason: null, lockedAt: null, lockedBy: null },
  )
  const sessionsEnded = locked ? revokeSessions(account.id) : 0
  recordAudit(actorOf(admin), {
    action: locked ? 'account.lock' : 'account.unlock',
    objectType: 'user',
    objectId: account.id,
    before: { accountStatus: current },
    after: { accountStatus: locked ? 'locked' : 'active', sessionsEnded, simulated: true },
    reason,
  })
  commit()
  return { accountStatus: locked ? ('locked' as const) : ('active' as const), sessionsEnded }
}

/** Locks a learner account (reason required). Blocks sign-in and ends the live session; records are kept. */
export const lockAccount = (userId: string, reason: string) => setLocked(userId, true, reason)

/** Unlocks a learner account (reason required). Access returns with progress untouched. */
export const unlockAccount = (userId: string, reason: string) => setLocked(userId, false, reason)

/**
 * Changes an account's role with a reason. The trainer role needs a trainer profile first
 * (Trainer management). Audited as `permission.change`.
 */
export async function changeRole(userId: string, input: { role: Role; reason: string }) {
  await delay()
  const admin = requireRole('admin')
  const account = findUser(userId)
  const { role, reason } = parseInput(adminRoleInput, input)
  if (account.id === admin.id) throw ApiError.badRequest('You cannot change your own role')
  if (account.role === role) throw ApiError.badRequest('The account already has this role')
  if (role === 'trainer' && !db.trainerProfiles.some((t) => t.userId === account.id)) {
    throw ApiError.badRequest(
      'Create the trainer profile in Trainer management before granting the trainer role',
    )
  }
  const before = account.role
  updateRow(account, { role })
  // A role change ends a live session so the new rights apply on the next sign-in.
  revokeSessions(account.id)
  recordAudit(actorOf(admin), {
    action: 'permission.change',
    objectType: 'user',
    objectId: account.id,
    before: { role: before },
    after: { role },
    reason,
  })
  commit()
  return { role }
}
