import { db } from '@server/db/connection'
import { isFinalReview } from '@server/db/review-filters'
import {
  attendance,
  programmes,
  reviews,
  sessions,
  submissions,
  trainerProfiles,
  trainerProgrammes,
  user,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import type {
  AdminTrainerCreateInput,
  AdminTrainerUpdateInput,
} from '@shared/schemas/admin-trainers'
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function approvalsOf(trainerIds: string[]) {
  if (trainerIds.length === 0) return new Map<string, ProgrammeCode[]>()
  const rows = await db
    .select({ trainerId: trainerProgrammes.trainerId, code: programmes.code })
    .from(trainerProgrammes)
    .innerJoin(programmes, eq(programmes.id, trainerProgrammes.programmeId))
    .where(inArray(trainerProgrammes.trainerId, trainerIds))
  const map = new Map<string, ProgrammeCode[]>()
  for (const row of rows)
    map.set(row.trainerId, [...(map.get(row.trainerId) ?? []), row.code].sort())
  return map
}

export async function listTrainers() {
  const asOf = now()
  const rows = await db
    .select({
      id: trainerProfiles.id,
      userId: trainerProfiles.userId,
      code: trainerProfiles.code,
      fullName: trainerProfiles.fullName,
      headline: trainerProfiles.headline,
      bio: trainerProfiles.bio,
      expertise: trainerProfiles.expertise,
      languages: trainerProfiles.languages,
      organisation: trainerProfiles.organisation,
      avatarPath: trainerProfiles.avatarPath,
      email: user.email,
      role: user.role,
      sessions: sql<number>`(select count(*)::int from ${sessions} s where s.trainer_id = ${trainerProfiles.id})`,
      upcoming: sql<number>`(select count(*)::int from ${sessions} s where s.trainer_id = ${trainerProfiles.id}
        and s.starts_at > ${asOf.toISOString()}::timestamptz and s.status in ('published', 'full'))`,
      pendingMarking: sql<number>`(select count(*)::int from ${submissions} sb where sb.marker_trainer_id = ${trainerProfiles.id}
        and sb.status in ('submitted', 'under_review'))`,
    })
    .from(trainerProfiles)
    .innerJoin(user, eq(user.id, trainerProfiles.userId))
    .orderBy(asc(trainerProfiles.code))
  const approvals = await approvalsOf(rows.map((row) => row.id))
  return rows.map((row) => ({ ...row, programmes: approvals.get(row.id) ?? [] }))
}

export async function getTrainer(trainerId: string) {
  const list = await listTrainers()
  const trainer = list.find((row) => row.id === trainerId)
  if (!trainer) throw HttpError.notFound('Trainer not found')
  const [sessionRows, marked, reviewed] = await Promise.all([
    db
      .select({
        id: sessions.id,
        code: sessions.code,
        title: sessions.title,
        programme: programmes.code,
        format: sessions.format,
        status: sessions.status,
        startsAt: sessions.startsAt,
        capacity: sessions.capacity,
      })
      .from(sessions)
      .innerJoin(programmes, eq(programmes.id, sessions.programmeId))
      .where(eq(sessions.trainerId, trainerId))
      .orderBy(asc(sessions.startsAt)),
    db
      .select({ n: count() })
      .from(attendance)
      .innerJoin(sessions, eq(sessions.id, attendance.sessionId))
      .where(and(eq(sessions.trainerId, trainerId), sql`${attendance.status} <> 'pending'`)),
    db
      .select({ n: count() })
      .from(reviews)
      .where(and(eq(reviews.reviewerId, trainer.userId), isFinalReview)),
  ])
  return {
    trainer,
    sessions: sessionRows,
    attendanceRecords: marked[0]?.n ?? 0,
    reviewsCompleted: reviewed[0]?.n ?? 0,
  }
}

async function programmeIds(tx: Tx, codes: readonly ProgrammeCode[]) {
  if (codes.length === 0) return []
  return tx
    .select({ id: programmes.id, code: programmes.code })
    .from(programmes)
    .where(inArray(programmes.code, [...codes]))
}

export async function createTrainer(
  viewer: Viewer,
  input: AdminTrainerCreateInput,
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
    const [max] = await tx
      .select({ n: sql<number>`coalesce(max(substring(${trainerProfiles.code} from 2)::int), 0)` })
      .from(trainerProfiles)
    const code = `T${String((max?.n ?? 0) + 1).padStart(2, '0')}`
    const userId = `user-${crypto.randomUUID()}`
    // Admin-provisioned: the role is set here, never through public sign-up (brief §3, §14).
    await tx.insert(user).values({
      id: userId,
      name: input.fullName,
      email: input.email,
      emailVerified: false,
      role: 'trainer',
      createdAt: at,
      updatedAt: at,
    })
    const [profile] = await tx
      .insert(trainerProfiles)
      .values({
        userId,
        code,
        fullName: input.fullName,
        headline: input.headline,
        bio: input.bio,
        expertise: input.expertise,
        languages: input.languages,
        organisation: input.organisation,
        createdAt: at,
        updatedAt: at,
      })
      .returning({ id: trainerProfiles.id })
    const trainerId = profile?.id as string
    const progs = await programmeIds(tx, input.programmes)
    if (progs.length)
      await tx
        .insert(trainerProgrammes)
        .values(progs.map((p) => ({ trainerId, programmeId: p.id })))
    await recordAudit(
      viewer,
      {
        action: 'trainer.create',
        objectType: 'trainer',
        objectId: code,
        after: { code, role: 'trainer', approvedProgrammes: input.programmes },
        reason: 'Trainer account provisioned by an administrator',
      },
      tx,
      requestId,
    )
    return { trainerId, code }
  })
}

export async function updateTrainer(
  viewer: Viewer,
  trainerId: string,
  input: AdminTrainerUpdateInput,
  requestId?: string,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(trainerProfiles)
      .where(eq(trainerProfiles.id, trainerId))
      .limit(1)
    if (!before) throw HttpError.notFound('Trainer not found')
    await tx
      .update(trainerProfiles)
      .set({ ...input, updatedAt: now() })
      .where(eq(trainerProfiles.id, trainerId))
    if (input.fullName)
      await tx.update(user).set({ name: input.fullName }).where(eq(user.id, before.userId))
    const keys = Object.keys(input) as (keyof AdminTrainerUpdateInput)[]
    await recordAudit(
      viewer,
      {
        action: 'trainer.update',
        objectType: 'trainer',
        objectId: before.code,
        before: Object.fromEntries(keys.map((k) => [k, before[k]])),
        after: Object.fromEntries(keys.map((k) => [k, input[k]])),
      },
      tx,
      requestId,
    )
    return { updated: keys }
  })
}

export async function setProgrammes(
  viewer: Viewer,
  trainerId: string,
  codes: ProgrammeCode[],
  reason: string,
  requestId?: string,
) {
  return db.transaction(async (tx) => {
    const [trainer] = await tx
      .select({ code: trainerProfiles.code })
      .from(trainerProfiles)
      .where(eq(trainerProfiles.id, trainerId))
      .limit(1)
    if (!trainer) throw HttpError.notFound('Trainer not found')
    const current = await tx
      .select({ code: programmes.code })
      .from(trainerProgrammes)
      .innerJoin(programmes, eq(programmes.id, trainerProgrammes.programmeId))
      .where(eq(trainerProgrammes.trainerId, trainerId))
    const before = current.map((row) => row.code).sort()
    const after = [...new Set(codes)].sort()
    if (before.join() === after.join())
      throw HttpError.badRequest('No change to the approved programmes')
    await tx.delete(trainerProgrammes).where(eq(trainerProgrammes.trainerId, trainerId))
    const progs = await programmeIds(tx, after)
    if (progs.length)
      await tx
        .insert(trainerProgrammes)
        .values(progs.map((p) => ({ trainerId, programmeId: p.id })))
    await recordAudit(
      viewer,
      {
        action: 'permission.change',
        objectType: 'trainer',
        objectId: trainer.code,
        before: { approvedProgrammes: before },
        after: { approvedProgrammes: after },
        reason,
      },
      tx,
      requestId,
    )
    return { approvedProgrammes: after }
  })
}
