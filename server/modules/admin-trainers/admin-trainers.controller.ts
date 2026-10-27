import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import {
  PERMISSION_MATRIX,
  TRAINER_LEARNER_FIELDS,
  TRAINER_MARKS_EXPORT_FIELDS,
} from '@shared/permissions'
import type {
  AdminTrainerCreateInput,
  AdminTrainerUpdateInput,
} from '@shared/schemas/admin-trainers'
import * as service from './admin-trainers.service'

/** Session rights and reporting permissions are role-based (brief §11), shown read-only. */
function trainerRights() {
  return Object.entries(PERMISSION_MATRIX).map(([action, row]) => ({
    action,
    label: row.label,
    access: row.trainer,
    note: row.note.trainer,
  }))
}

export async function list() {
  const rows = await service.listTrainers()
  return { items: rows }
}

export async function detail(trainerId: string) {
  const d = await service.getTrainer(trainerId)
  return {
    ...d,
    sessions: d.sessions.map((s) => ({ ...s, startsAt: s.startsAt.toISOString() })),
    rights: trainerRights(),
    visibleLearnerFields: TRAINER_LEARNER_FIELDS,
    marksExportFields: TRAINER_MARKS_EXPORT_FIELDS,
  }
}

export const create = (viewer: Viewer, input: AdminTrainerCreateInput, requestId?: string) =>
  service.createTrainer(viewer, input, requestId)

export const update = (
  viewer: Viewer,
  trainerId: string,
  input: AdminTrainerUpdateInput,
  requestId?: string,
) => service.updateTrainer(viewer, trainerId, input, requestId)

export const setProgrammes = (
  viewer: Viewer,
  trainerId: string,
  codes: ProgrammeCode[],
  reason: string,
  requestId?: string,
) => service.setProgrammes(viewer, trainerId, codes, reason, requestId)
