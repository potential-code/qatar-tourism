import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import type { ScormCommitBody } from '@shared/schemas/learning-engine'
import * as service from './scorm.service'

export function ping() {
  return { module: 'scorm' as const, status: 'ok' as const }
}

export const state = (viewer: Viewer, programme: ProgrammeCode, code: string) =>
  service.getState(viewer.id, programme, code)
export const commit = (viewer: Viewer, code: string, body: ScormCommitBody) =>
  service.commit(viewer.id, code, body)
export const restart = (viewer: Viewer, programme: ProgrammeCode, code: string) =>
  service.restart(viewer.id, programme, code)
