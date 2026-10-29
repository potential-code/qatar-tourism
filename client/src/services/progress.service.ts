/**
 * Progress (brief §5–8): the learner journey read model, the learner unit events, and the shared
 * `recomputeEnrolment` seam. The programme rules live in progress/rules.ts.
 */

export { getAttemptHistory, getJourney, type Journey } from './progress/journey'
export { recomputeEnrolment } from './progress/recompute'
export {
  answerFormative,
  recordBranching,
  recordPreviewViewed,
  recordVideo,
  saveResource,
} from './progress/units'
