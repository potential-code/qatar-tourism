import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import * as service from './enrolments.service'

export function ping() {
  return { module: 'enrolments' as const, status: 'ok' as const }
}

export const mine = (viewer: Viewer) => service.listMine(viewer.id)
export const enrol = (viewer: Viewer, programme: ProgrammeCode) =>
  service.enrolLearner(viewer.id, programme, undefined, viewer)
