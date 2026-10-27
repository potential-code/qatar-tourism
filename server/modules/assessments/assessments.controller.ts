import type { Viewer } from '@server/middleware/auth.middleware'
import type { Competency, ProgrammeCode } from '@shared/constants'
import type { AssessmentKind } from './assessments.bank'
import * as service from './assessments.service'

export function ping() {
  return { module: 'assessments' as const, status: 'ok' as const }
}

export const overview = (viewer: Viewer, programme: ProgrammeCode) =>
  service.overview(viewer.id, programme)
export const state = (viewer: Viewer, programme: ProgrammeCode, kind: AssessmentKind) =>
  service.getState(viewer.id, programme, kind)
export const start = (viewer: Viewer, programme: ProgrammeCode, kind: AssessmentKind) =>
  service.start(viewer.id, programme, kind)
export const save = (
  viewer: Viewer,
  attemptId: string,
  competency: Competency,
  option: 'A' | 'B' | 'C',
) => service.saveAnswer(viewer.id, attemptId, competency, option)
export const submit = (viewer: Viewer, attemptId: string) => service.submit(viewer.id, attemptId)
export const result = (viewer: Viewer, attemptId: string) => service.resultFor(viewer.id, attemptId)
