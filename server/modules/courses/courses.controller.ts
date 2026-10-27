import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import * as service from './courses.service'

export function ping() {
  return { module: 'courses' as const, status: 'ok' as const }
}

export const unit = (viewer: Viewer, programme: ProgrammeCode, code: string) =>
  service.getUnit(viewer.id, programme, code)
