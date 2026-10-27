import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import type {
  BranchingBody,
  FormativeAnswerBody,
  ResourceBody,
  VideoProgressBody,
} from '@shared/schemas/learning-engine'
import { getAttemptHistory, getJourney } from './progress.journey'
import * as units from './progress.units'

export function ping() {
  return { module: 'progress' as const, status: 'ok' as const }
}

export const journey = (viewer: Viewer, programme: ProgrammeCode) =>
  getJourney(viewer.id, programme)
export const history = (viewer: Viewer, programme: ProgrammeCode) =>
  getAttemptHistory(viewer.id, programme)
export const video = (viewer: Viewer, body: VideoProgressBody) => units.recordVideo(viewer.id, body)
export const branching = (viewer: Viewer, body: BranchingBody) =>
  units.recordBranching(viewer.id, body)
export const formative = (viewer: Viewer, body: FormativeAnswerBody) =>
  units.answerFormative(viewer.id, body)
export const resource = (viewer: Viewer, body: ResourceBody) => units.saveResource(viewer.id, body)
export const preview = (viewer: Viewer, programme: ProgrammeCode) =>
  units.recordPreviewViewed(viewer.id, programme)
