import { db } from '@server/db/connection'
import { finalReviewOfSubmission } from '@server/db/review-filters'
import {
  assessmentAttempts,
  assessments,
  assignmentRules,
  assignments,
  attendance,
  auditEvents,
  certificates,
  enrolments,
  learningPaths,
  notifications,
  organisations,
  profiles,
  programmes,
  reviews,
  rolePlayAttempts,
  rsvps,
  session,
  sessions,
  submissions,
  trainerProfiles,
  user,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import { type RuleDefinition, type RuleGroup, resolvePathRule } from '@shared/content/paths'
import type { Role } from '@shared/roles'
import type {
  AdminUserCreateInput,
  AdminUserListQuery,
  AdminUserUpdateInput,
} from '@shared/schemas/admin-users'
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import { notify } from '../notifications/notifications.service'
import { nextLearnerCode } from '../profiles/learner-code.service'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Status of an account as user management shows it. */
export type AccountStatus = 'active' | 'suspended' | 'invited'

const statusSql = sql<AccountStatus>`case
  when ${profiles.suspended} then 'suspended'
  when ${user.emailVerified} = false then 'invited'
  else 'active' end`

// ---------------------------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------------------------

export async function listUsers(query: AdminUserListQuery) {
  const term = query.search ? `%${query.search}%` : null
  const where = and(
    query.role ? eq(user.role, query.role) : undefined,
    term
      ? or(ilike(user.name, term), ilike(user.email, term), ilike(profiles.learnerCode, term))
      : undefined,
    query.status === 'suspended' ? eq(profiles.suspended, true) : undefined,
    query.status === 'invited'
      ? and(
          eq(user.emailVerified, false),
          or(isNull(profiles.suspended), eq(profiles.suspended, false)),
        )
      : undefined,
    query.status === 'active'
      ? and(
          eq(user.emailVerified, true),
          or(isNull(profiles.suspended), eq(profiles.suspended, false)),
        )
      : undefined,
    query.programme
      ? sql`exists (select 1 from ${enrolments} e join ${programmes} p on p.id = e.programme_id
          where e.learner_id = ${user.id} and p.code = ${query.programme})`
      : undefined,
  )

  const base = () =>
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        learnerCode: profiles.learnerCode,
        organisation: organisations.name,
        jobTitle: profiles.jobTitle,
        lastActivityAt: profiles.lastActivityAt,
        status: statusSql,
        programmes: sql<string[]>`coalesce((select array_agg(p.code order by p.code)
          from ${enrolments} e join ${programmes} p on p.id = e.programme_id
          where e.learner_id = ${user.id}), '{}')`,
      })
      .from(user)
      .leftJoin(profiles, eq(profiles.userId, user.id))
      .leftJoin(organisations, eq(organisations.id, profiles.organisationId))

  const [items, totals] = await Promise.all([
    base()
      .where(where)
      // Learners by code first (new accounts last among them), then trainers and administrators.
      .orderBy(
        sql`case ${user.role} when 'learner' then 0 when 'trainer' then 1 else 2 end`,
        asc(profiles.learnerCode),
        asc(user.name),
      )
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({ total: count() })
      .from(user)
      .leftJoin(profiles, eq(profiles.userId, user.id))
      .where(where),
  ])
  return { items, total: totals[0]?.total ?? 0 }
}

export async function listOptions() {
  const [orgs, progs] = await Promise.all([
    db
      .select({ id: organisations.id, name: organisations.name, type: organisations.type })
      .from(organisations)
      .orderBy(organisations.name),
    db
      .select({ code: programmes.code, title: programmes.title, status: programmes.status })
      .from(programmes)
      .orderBy(programmes.code),
  ])
  return { organisations: orgs, programmes: progs }
}

// ---------------------------------------------------------------------------------------------
// Detail and timeline
// ---------------------------------------------------------------------------------------------

async function requireUser(userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  if (!row) throw HttpError.notFound('User not found')
  return row
}

export async function getUserDetail(userId: string) {
  const account = await requireUser(userId)
  const [profileRow] = await db
    .select({
      learnerCode: profiles.learnerCode,
      fullName: profiles.fullName,
      organisationId: profiles.organisationId,
      organisationName: organisations.name,
      organisationType: organisations.type,
      jobTitle: profiles.jobTitle,
      jobFunction: profiles.jobFunction,
      seniority: profiles.seniority,
      experience: profiles.experience,
      country: profiles.country,
      city: profiles.city,
      preferredLanguage: profiles.preferredLanguage,
      goals: profiles.goals,
      status: profiles.status,
      suspended: profiles.suspended,
      registeredAt: profiles.registeredAt,
      lastActivityAt: profiles.lastActivityAt,
      completeness: profiles.completeness,
    })
    .from(profiles)
    .leftJoin(organisations, eq(organisations.id, profiles.organisationId))
    .where(eq(profiles.userId, userId))
    .limit(1)

  const [enrolmentRows, attemptRows, playRows, bookingRows, submissionRows, certRows, noteRows] =
    await Promise.all([
      db
        .select({
          id: enrolments.id,
          programme: programmes.code,
          programmeTitle: programmes.title,
          status: enrolments.status,
          path: learningPaths.name,
          assignmentReason: enrolments.assignmentReason,
          overrideReason: enrolments.overrideReason,
          currentStage: enrolments.currentStage,
          progress: enrolments.progressPercent,
          enrolledAt: enrolments.enrolledAt,
          startedAt: enrolments.startedAt,
          completedAt: enrolments.completedAt,
          lastActivityAt: enrolments.lastActivityAt,
        })
        .from(enrolments)
        .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
        .leftJoin(learningPaths, eq(learningPaths.id, enrolments.pathId))
        .where(eq(enrolments.learnerId, userId))
        .orderBy(programmes.code),
      db
        .select({
          id: assessmentAttempts.id,
          programme: programmes.code,
          title: assessments.title,
          kind: assessments.kind,
          version: assessments.version,
          attemptNo: assessmentAttempts.attemptNo,
          status: assessmentAttempts.status,
          score: assessmentAttempts.score,
          passPercent: assessments.passPercent,
          submittedAt: assessmentAttempts.submittedAt,
          startedAt: assessmentAttempts.startedAt,
        })
        .from(assessmentAttempts)
        .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
        .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
        .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
        .where(eq(assessmentAttempts.learnerId, userId))
        .orderBy(desc(assessmentAttempts.startedAt)),
      db
        .select({
          id: rolePlayAttempts.id,
          scenarioKey: rolePlayAttempts.scenarioKey,
          mode: rolePlayAttempts.mode,
          totalPercent: rolePlayAttempts.totalPercent,
          completedAt: rolePlayAttempts.completedAt,
        })
        .from(rolePlayAttempts)
        .where(eq(rolePlayAttempts.learnerId, userId))
        .orderBy(desc(rolePlayAttempts.completedAt)),
      db
        .select({
          id: rsvps.id,
          sessionId: sessions.id,
          sessionCode: sessions.code,
          sessionTitle: sessions.title,
          format: sessions.format,
          startsAt: sessions.startsAt,
          sessionStatus: sessions.status,
          trainer: trainerProfiles.fullName,
          status: rsvps.status,
          waitlistPosition: rsvps.waitlistPosition,
          bookedAt: rsvps.bookedAt,
          attendance: attendance.status,
          markedAt: attendance.markedAt,
        })
        .from(rsvps)
        .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
        .innerJoin(trainerProfiles, eq(trainerProfiles.id, sessions.trainerId))
        .leftJoin(attendance, eq(attendance.rsvpId, rsvps.id))
        .where(eq(rsvps.learnerId, userId))
        .orderBy(desc(sessions.startsAt)),
      db
        .select({
          id: submissions.id,
          assignment: assignments.title,
          version: submissions.version,
          status: submissions.status,
          submittedAt: submissions.submittedAt,
          score: reviews.rubricScore,
          reviewStatus: reviews.status,
          feedback: reviews.feedback,
          reviewedAt: reviews.reviewedAt,
        })
        .from(submissions)
        .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
        .leftJoin(reviews, finalReviewOfSubmission)
        .where(eq(submissions.learnerId, userId))
        .orderBy(desc(submissions.submittedAt)),
      db
        .select({
          id: certificates.id,
          code: certificates.code,
          status: certificates.status,
          issuedAt: certificates.issuedAt,
          revokedAt: certificates.revokedAt,
        })
        .from(certificates)
        .where(eq(certificates.learnerId, userId)),
      db
        .select({
          id: notifications.id,
          kind: notifications.kind,
          channel: notifications.channel,
          state: notifications.state,
          subject: notifications.subject,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.recipientId, userId))
        .orderBy(desc(notifications.createdAt)),
    ])

  const objectIds = [userId, ...enrolmentRows.map((e) => e.id)]
  if (profileRow) objectIds.push(profileRow.learnerCode)
  const auditRows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      actorLabel: auditEvents.actorLabel,
      actorRole: auditEvents.actorRole,
      reason: auditEvents.reason,
      outcome: auditEvents.outcome,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(inArray(auditEvents.objectId, objectIds))
    .orderBy(desc(auditEvents.createdAt))

  return {
    account,
    profile: profileRow ?? null,
    enrolments: enrolmentRows,
    attempts: attemptRows,
    rolePlays: playRows,
    bookings: bookingRows,
    submissions: submissionRows,
    certificates: certRows,
    notifications: noteRows,
    audit: auditRows,
  }
}

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

/** Published assignment rules of a programme as the shared resolver expects them. */
async function rulesFor(tx: Tx, programme: ProgrammeCode): Promise<RuleDefinition[]> {
  const rows = await tx
    .select({
      code: assignmentRules.code,
      name: assignmentRules.name,
      priority: assignmentRules.priority,
      isDefault: assignmentRules.isDefault,
      conditions: assignmentRules.conditions,
      summary: assignmentRules.summary,
      pathCode: learningPaths.code,
    })
    .from(assignmentRules)
    .innerJoin(programmes, eq(programmes.id, assignmentRules.programmeId))
    .innerJoin(learningPaths, eq(learningPaths.id, assignmentRules.pathId))
    .where(and(eq(programmes.code, programme), eq(assignmentRules.status, 'published')))
  return rows.map((row) => ({
    ...row,
    programme,
    conditions: row.conditions as RuleGroup,
    variation: row.summary,
  }))
}

async function enrolWithin(tx: Tx, userId: string, programme: ProgrammeCode) {
  const [prog] = await tx
    .select({ id: programmes.id, status: programmes.status })
    .from(programmes)
    .where(eq(programmes.code, programme))
    .limit(1)
  if (!prog) throw HttpError.notFound('Programme not found')
  if (prog.status === 'archived')
    throw HttpError.badRequest('This programme is archived and cannot take new enrolments')

  const [existing] = await tx
    .select({ id: enrolments.id })
    .from(enrolments)
    .where(and(eq(enrolments.learnerId, userId), eq(enrolments.programmeId, prog.id)))
    .limit(1)
  if (existing)
    throw new HttpError(
      409,
      'ALREADY_ENROLLED',
      `This learner is already enrolled in Program ${programme}`,
    )

  const [profile] = await tx
    .select({
      organisationType: organisations.type,
      organisation: organisations.name,
      jobFunction: profiles.jobFunction,
      jobTitle: profiles.jobTitle,
      seniority: profiles.seniority,
      experience: profiles.experience,
      goals: profiles.goals,
      status: profiles.status,
    })
    .from(profiles)
    .leftJoin(organisations, eq(organisations.id, profiles.organisationId))
    .where(eq(profiles.userId, userId))
    .limit(1)
  if (!profile) throw HttpError.badRequest('Only learner accounts with a profile can be enrolled')

  const rules = await rulesFor(tx, programme)
  const resolution = resolvePathRule(
    programme,
    {
      ...profile,
      goals: profile.goals as never,
      complete: profile.status === 'complete',
    },
    rules,
  )
  const [path] = await tx
    .select({ id: learningPaths.id, currentVersionId: learningPaths.currentVersionId })
    .from(learningPaths)
    .where(eq(learningPaths.code, resolution.rule.pathCode))
    .limit(1)

  const at = now()
  const [created] = await tx
    .insert(enrolments)
    .values({
      learnerId: userId,
      programmeId: prog.id,
      status: 'not_started',
      pathId: path?.id ?? null,
      pathVersionId: path?.currentVersionId ?? null,
      assignmentReason: resolution.reason,
      enrolledAt: at,
      createdAt: at,
      updatedAt: at,
    })
    .returning({ id: enrolments.id })
  return {
    enrolmentId: created?.id as string,
    reason: resolution.reason,
    pathCode: resolution.rule.pathCode,
  }
}

async function inviteWithin(tx: Tx, viewer: Viewer, userId: string, name: string) {
  const first = name.split(' ')[0] ?? name
  return notify(
    {
      eventId: `invite:${userId}`,
      kind: 'user_invited',
      recipientIds: [userId],
      subject: 'You are invited to the Qatar Tourism Academy',
      body: `Hello ${first}, an Academy administrator has created your account. Use the link in this demo message to set your password and complete your profile. This is a demonstration email in the notification log; no external email was sent.`,
      actorId: viewer.id,
    },
    tx,
  )
}

export async function createLearner(
  viewer: Viewer,
  input: AdminUserCreateInput,
  requestId?: string,
) {
  const [clash] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1)
  if (clash) throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists')

  return db.transaction(async (tx) => {
    const at = now()
    const userId = `user-${crypto.randomUUID()}`
    const learnerCode = await nextLearnerCode(tx)
    const completeness = completenessOf(input)
    await tx.insert(user).values({
      id: userId,
      name: input.name,
      email: input.email,
      // No password and not verified: the invitation is how the learner finishes sign-up.
      emailVerified: false,
      role: 'learner',
      createdAt: at,
      updatedAt: at,
    })
    await tx.insert(profiles).values({
      userId,
      learnerCode,
      fullName: input.name,
      organisationId: input.organisationId,
      jobTitle: input.jobTitle,
      jobFunction: input.jobFunction,
      seniority: input.seniority,
      experience: input.experience,
      status: completeness === 100 ? 'complete' : 'draft',
      wizardStep: completeness === 100 ? 3 : 1,
      completeness,
      registeredAt: at,
      createdAt: at,
      updatedAt: at,
    })
    await recordAudit(
      viewer,
      {
        action: 'user.create',
        objectType: 'user',
        objectId: userId,
        after: { learnerCode, role: 'learner', organisationId: input.organisationId },
        reason: 'Fictional learner added by an administrator',
      },
      tx,
      requestId,
    )
    let invited = 0
    if (input.invite) {
      invited = await inviteWithin(tx, viewer, userId, input.name)
      await recordAudit(
        viewer,
        {
          action: 'user.invite',
          objectType: 'user',
          objectId: userId,
          after: { channel: 'demo email and in-app', state: 'simulated' },
        },
        tx,
        requestId,
      )
    }
    let enrolment: Awaited<ReturnType<typeof enrolWithin>> | null = null
    if (input.programme) {
      enrolment = await enrolWithin(tx, userId, input.programme)
      await recordAudit(
        viewer,
        {
          action: 'enrolment.create',
          objectType: 'enrolment',
          objectId: enrolment.enrolmentId,
          after: { learnerCode, programme: input.programme, path: enrolment.pathCode },
          reason: enrolment.reason,
        },
        tx,
        requestId,
      )
    }
    return { userId, learnerCode, invitationsCreated: invited, enrolment }
  })
}

export async function updateLearner(
  viewer: Viewer,
  userId: string,
  input: AdminUserUpdateInput,
  requestId?: string,
) {
  await requireUser(userId)
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
    if (!before) throw HttpError.badRequest('Only learner profiles can be edited here')
    const merged = {
      organisationId:
        input.organisationId !== undefined ? input.organisationId : before.organisationId,
      jobTitle: input.jobTitle !== undefined ? input.jobTitle : before.jobTitle,
      jobFunction: input.jobFunction !== undefined ? input.jobFunction : before.jobFunction,
      seniority: input.seniority !== undefined ? input.seniority : before.seniority,
      experience: input.experience !== undefined ? input.experience : before.experience,
    }
    const at = now()
    await tx
      .update(profiles)
      .set({
        ...merged,
        fullName: input.name ?? before.fullName,
        completeness: Math.max(before.completeness, completenessOf(merged)),
        updatedAt: at,
      })
      .where(eq(profiles.userId, userId))
    if (input.name)
      await tx.update(user).set({ name: input.name, updatedAt: at }).where(eq(user.id, userId))

    const changed = Object.keys(input).filter(
      (key) =>
        (input as Record<string, unknown>)[key] !==
        (key === 'name' ? before.fullName : (before as Record<string, unknown>)[key]),
    )
    const pick = (source: Record<string, unknown>) =>
      Object.fromEntries(changed.map((key) => [key, source[key] ?? null]))
    await recordAudit(
      viewer,
      {
        action: 'user.update',
        objectType: 'user',
        objectId: userId,
        before: pick({ ...before, name: before.fullName }),
        after: pick(input as Record<string, unknown>),
      },
      tx,
      requestId,
    )
    return { updated: changed }
  })
}

export async function resendInvite(viewer: Viewer, userId: string, requestId?: string) {
  const account = await requireUser(userId)
  if (account.role !== 'learner') throw HttpError.badRequest('Only learners are invited from here')
  return db.transaction(async (tx) => {
    const created = await inviteWithin(tx, viewer, userId, account.name)
    await recordAudit(
      viewer,
      {
        action: 'user.invite',
        objectType: 'user',
        objectId: userId,
        after: { state: 'simulated', created },
        reason: created === 0 ? 'Invitation already in the demo log; no duplicate created' : null,
      },
      tx,
      requestId,
    )
    return { created }
  })
}

export async function enrol(
  viewer: Viewer,
  userId: string,
  programme: ProgrammeCode,
  requestId?: string,
) {
  await requireUser(userId)
  return db.transaction(async (tx) => {
    const result = await enrolWithin(tx, userId, programme)
    await recordAudit(
      viewer,
      {
        action: 'enrolment.create',
        objectType: 'enrolment',
        objectId: result.enrolmentId,
        after: { userId, programme, path: result.pathCode },
        reason: result.reason,
      },
      tx,
      requestId,
    )
    return result
  })
}

export async function setSuspended(
  viewer: Viewer,
  userId: string,
  suspended: boolean,
  reason: string,
  requestId?: string,
) {
  const account = await requireUser(userId)
  if (userId === viewer.id) throw HttpError.badRequest('You cannot suspend your own account')
  if (account.role === 'admin')
    throw HttpError.badRequest('Administrator accounts cannot be suspended here')
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ suspended: profiles.suspended })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1)
    if (!profile) throw HttpError.badRequest('Only learner accounts can be suspended here')
    if (profile.suspended === suspended)
      throw HttpError.badRequest(
        suspended ? 'The account is already suspended' : 'The account is already active',
      )
    await tx
      .update(profiles)
      .set({ suspended, updatedAt: now() })
      .where(eq(profiles.userId, userId))
    // Suspension takes effect at once: every live session is revoked.
    const revoked = suspended
      ? (await tx.delete(session).where(eq(session.userId, userId)).returning({ id: session.id }))
          .length
      : 0
    await recordAudit(
      viewer,
      {
        action: suspended ? 'user.suspend' : 'user.reactivate',
        objectType: 'user',
        objectId: userId,
        before: { suspended: profile.suspended },
        after: { suspended, sessionsRevoked: revoked },
        reason,
      },
      tx,
      requestId,
    )
    return { suspended, sessionsRevoked: revoked }
  })
}

export async function changeRole(
  viewer: Viewer,
  userId: string,
  role: Role,
  reason: string,
  requestId?: string,
) {
  const account = await requireUser(userId)
  if (userId === viewer.id) throw HttpError.badRequest('You cannot change your own role')
  if (account.role === role) throw HttpError.badRequest('The account already has this role')
  if (role === 'trainer') {
    const [trainer] = await db
      .select({ id: trainerProfiles.id })
      .from(trainerProfiles)
      .where(eq(trainerProfiles.userId, userId))
      .limit(1)
    if (!trainer)
      throw HttpError.badRequest(
        'Create the trainer profile in Trainer management before granting the trainer role',
      )
  }
  return db.transaction(async (tx) => {
    await tx.update(user).set({ role, updatedAt: now() }).where(eq(user.id, userId))
    // A role change revokes live sessions so the new rights apply on the next sign-in.
    await tx.delete(session).where(eq(session.userId, userId))
    await recordAudit(
      viewer,
      {
        action: 'permission.change',
        objectType: 'user',
        objectId: userId,
        before: { role: account.role },
        after: { role },
        reason,
      },
      tx,
      requestId,
    )
    return { role }
  })
}
