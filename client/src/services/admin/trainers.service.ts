import type { ProgrammeCode } from '@shared/constants'
import {
  PERMISSION_MATRIX,
  TRAINER_LEARNER_FIELDS,
  TRAINER_MARKS_EXPORT_FIELDS,
} from '@shared/permissions'
import {
  type AdminTrainerCreateInput,
  type AdminTrainerUpdateInput,
  adminTrainerCreateInput,
  adminTrainerProgrammesInput,
  adminTrainerUpdateInput,
  trainerIdParam,
} from '@shared/schemas/admin-trainers'
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
  now,
  out,
  parseInput,
  requireRole,
  updateRow,
} from '../api'
import { audit } from '../audit.service'
import { removeWhere } from './rows'

/**
 * Trainer management (brief §14), formerly /api/admin/trainers. Admin only. Trainer accounts
 * are provisioned here, never through public sign-up; approved programmes change with a reason
 * and are audited as a permission change.
 */

function approvalsOf(trainerId: string): ProgrammeCode[] {
  const programmes = indexBy(db.programmes, (p) => p.id)
  return db.trainerProgrammes
    .filter((a) => a.trainerId === trainerId)
    .flatMap((a) => {
      const code = programmes.get(a.programmeId)?.code
      return code ? [code] : []
    })
    .sort()
}

function trainerList() {
  const asOf = now().getTime()
  const users = indexBy(db.users, (u) => u.id)
  return [...db.trainerProfiles]
    .sort((a, b) => a.code.localeCompare(b.code))
    .flatMap((t) => {
      const account = users.get(t.userId)
      if (!account) return []
      const mine = db.sessions.filter((s) => s.trainerId === t.id)
      return [
        {
          id: t.id,
          userId: t.userId,
          code: t.code,
          fullName: t.fullName,
          headline: t.headline,
          bio: t.bio,
          expertise: t.expertise,
          languages: t.languages,
          organisation: t.organisation,
          avatarPath: t.avatarPath,
          email: account.email,
          role: account.role,
          sessions: mine.length,
          upcoming: mine.filter(
            (s) =>
              Date.parse(s.startsAt) > asOf && (s.status === 'published' || s.status === 'full'),
          ).length,
          pendingMarking: db.submissions.filter(
            (s) =>
              s.markerTrainerId === t.id &&
              (s.status === 'submitted' || s.status === 'under_review'),
          ).length,
          programmes: approvalsOf(t.id),
        },
      ]
    })
}

/** Session rights and reporting permissions are role-based (brief §11), shown read-only. */
function trainerRights() {
  return Object.entries(PERMISSION_MATRIX).map(([action, row]) => ({
    action,
    label: row.label,
    access: row.trainer,
    note: row.note.trainer,
  }))
}

export async function listTrainers() {
  await delay()
  requireRole('admin')
  return out({ items: trainerList() })
}

export async function getTrainer(trainerId: string) {
  await delay()
  requireRole('admin')
  parseInput(trainerIdParam, { trainerId }, 'param')
  const trainer = findOr404(trainerList(), (t) => t.id === trainerId, 'Trainer not found')
  const programmes = indexBy(db.programmes, (p) => p.id)
  const sessions = db.sessions
    .filter((s) => s.trainerId === trainerId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const own = new Set(sessions.map((s) => s.id))
  return out({
    trainer,
    sessions: sessions.map((s) => ({
      id: s.id,
      code: s.code,
      title: s.title,
      programme: programmes.get(s.programmeId)?.code ?? 'A',
      format: s.format,
      status: s.status,
      startsAt: s.startsAt,
      capacity: s.capacity,
    })),
    attendanceRecords: db.attendance.filter((a) => own.has(a.sessionId) && a.status !== 'pending')
      .length,
    reviewsCompleted: db.reviews.filter(
      (r) => r.reviewerId === trainer.userId && r.status !== 'draft',
    ).length,
    rights: trainerRights(),
    visibleLearnerFields: TRAINER_LEARNER_FIELDS,
    marksExportFields: TRAINER_MARKS_EXPORT_FIELDS,
  })
}

function approve(trainerId: string, codes: readonly ProgrammeCode[]) {
  for (const programme of db.programmes) {
    if (codes.includes(programme.code))
      insertRow('trainerProgrammes', { trainerId, programmeId: programme.id })
  }
}

/** Provisions a trainer account (role set here, never through public sign-up). Audited. */
export async function createTrainer(input: AdminTrainerCreateInput) {
  await delay()
  requireRole('admin')
  const data = parseInput(adminTrainerCreateInput, input)
  const email = data.email.toLowerCase()
  if (db.users.some((u) => u.email.toLowerCase() === email))
    throw ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists')

  const max = Math.max(0, ...db.trainerProfiles.map((t) => Number(t.code.slice(1)) || 0))
  const code = `T${String(max + 1).padStart(2, '0')}`
  const userId = newId('user')
  insertRow('users', {
    id: userId,
    name: data.fullName,
    email: data.email,
    emailVerified: false,
    image: null,
    role: 'trainer',
  })
  const profile = insertRow('trainerProfiles', {
    userId,
    code,
    fullName: data.fullName,
    headline: data.headline,
    bio: data.bio,
    expertise: data.expertise,
    languages: data.languages,
    organisation: data.organisation,
  })
  approve(profile.id, data.programmes)
  audit({
    action: 'trainer.create',
    objectType: 'trainer',
    objectId: code,
    after: { code, role: 'trainer', approvedProgrammes: data.programmes },
    reason: 'Trainer account provisioned by an administrator',
  })
  commit()
  return { trainerId: profile.id, code }
}

export async function updateTrainer(trainerId: string, input: AdminTrainerUpdateInput) {
  await delay()
  requireRole('admin')
  parseInput(trainerIdParam, { trainerId }, 'param')
  const data = parseInput(adminTrainerUpdateInput, input)
  const trainer = findOr404(db.trainerProfiles, (t) => t.id === trainerId, 'Trainer not found')
  const keys = Object.keys(data) as (keyof AdminTrainerUpdateInput)[]
  const before = Object.fromEntries(keys.map((k) => [k, structuredClone(trainer[k])]))
  updateRow(trainer, data)
  if (data.fullName) {
    const account = db.users.find((u) => u.id === trainer.userId)
    if (account) updateRow(account, { name: data.fullName })
  }
  audit({
    action: 'trainer.update',
    objectType: 'trainer',
    objectId: trainer.code,
    before,
    after: Object.fromEntries(keys.map((k) => [k, data[k]])),
  })
  commit()
  return { updated: keys }
}

/** Replaces the approved programmes, with a reason. Audited as a permission change. */
export async function setTrainerProgrammes(
  trainerId: string,
  input: z.input<typeof adminTrainerProgrammesInput>,
) {
  await delay()
  requireRole('admin')
  parseInput(trainerIdParam, { trainerId }, 'param')
  const { programmes, reason } = parseInput(adminTrainerProgrammesInput, input)
  const trainer = findOr404(db.trainerProfiles, (t) => t.id === trainerId, 'Trainer not found')
  const before = approvalsOf(trainerId)
  const after = [...new Set(programmes)].sort()
  if (before.join() === after.join())
    throw ApiError.badRequest('No change to the approved programmes')
  removeWhere(db.trainerProgrammes, (a) => a.trainerId === trainerId)
  approve(trainerId, after)
  audit({
    action: 'permission.change',
    objectType: 'trainer',
    objectId: trainer.code,
    before: { approvedProgrammes: before },
    after: { approvedProgrammes: after },
    reason,
  })
  commit()
  return { approvedProgrammes: after }
}

export type TrainerListItem = Awaited<ReturnType<typeof listTrainers>>['items'][number]
export type TrainerDetail = Awaited<ReturnType<typeof getTrainer>>
