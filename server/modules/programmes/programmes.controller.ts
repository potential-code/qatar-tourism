import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import * as enrolmentService from './enrolment.service'
import { assertCanSelfEnrol } from './programmes.policy'
import * as programmesService from './programmes.service'

export function ping() {
  return { module: 'programmes' as const, status: 'ok' as const }
}

export async function list() {
  return { items: await programmesService.listProgrammes() }
}

export async function detail(code: ProgrammeCode) {
  const programme = await programmesService.getProgramme(code)
  if (!programme) throw HttpError.notFound('Programme not found')
  return programme
}

export async function upcomingSessions(programme?: ProgrammeCode) {
  return { items: await programmesService.listUpcomingSessions({ programme }) }
}

export async function trainers() {
  return { items: await programmesService.listTrainers() }
}

export async function trainer(code: string) {
  const row = await programmesService.getTrainer(code)
  if (!row) throw HttpError.notFound('Trainer not found')
  return row
}

export async function myEnrolments(viewer: Viewer) {
  if (viewer.role !== 'learner') return { items: [] }
  return { items: await enrolmentService.listOwnEnrolments(viewer.id) }
}

/** Join Program A (or B) from the public site (brief §3 routing rules). */
export async function enrol(viewer: Viewer, code: ProgrammeCode) {
  assertCanSelfEnrol(viewer.role, code)
  const result = await enrolmentService.enrolSelf(viewer, code)
  return { programme: code, ...result }
}
