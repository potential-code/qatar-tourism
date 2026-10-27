import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import * as service from './ai-path.service'

export function ping() {
  return { module: 'ai-path' as const, status: 'ok' as const }
}

export const recommendation = (viewer: Viewer, programme: ProgrammeCode) =>
  service.getRecommendation(viewer.id, programme)

export const accept = (viewer: Viewer, programme: ProgrammeCode) =>
  service.accept(viewer, programme)
