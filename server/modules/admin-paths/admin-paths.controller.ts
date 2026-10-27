import type { Viewer } from '@server/middleware/auth.middleware'
import type {
  CreatePathInput,
  DraftItemsInput,
  MatchPreviewInput,
  PublishInput,
  RuleInput,
} from '@shared/schemas/admin-paths'
import * as rulesService from './admin-paths.rules.service'
import * as pathsService from './admin-paths.service'

/** Plain functions: request data in, response DTO out. No Hono here (docs/DECISIONS.md). */

export const list = () => pathsService.listPaths()
export const catalogue = () => pathsService.catalogue()
export const detail = (pathId: string) => pathsService.getPath(pathId)

export const create = (viewer: Viewer, input: CreatePathInput, requestId?: string) =>
  pathsService.createPath(viewer, input, requestId)

export const update = (
  viewer: Viewer,
  pathId: string,
  input: { name?: string; description?: string; isDefault?: true },
  requestId?: string,
) => pathsService.updatePath(viewer, pathId, input, requestId)

export const startDraft = (viewer: Viewer, pathId: string, requestId?: string) =>
  pathsService.ensureDraft(viewer, pathId, requestId)

export const saveDraft = (
  viewer: Viewer,
  pathId: string,
  input: DraftItemsInput,
  requestId?: string,
) => pathsService.saveDraft(viewer, pathId, input, requestId)

export const discardDraft = (viewer: Viewer, pathId: string, requestId?: string) =>
  pathsService.discardDraft(viewer, pathId, requestId)

export const publish = (viewer: Viewer, pathId: string, input: PublishInput, requestId?: string) =>
  pathsService.publish(viewer, pathId, input, requestId)

export const createRule = (viewer: Viewer, input: RuleInput, requestId?: string) =>
  rulesService.createRule(viewer, input, requestId)

export const updateRule = (viewer: Viewer, ruleId: string, input: RuleInput, requestId?: string) =>
  rulesService.updateRule(viewer, ruleId, input, requestId)

export const preview = (input: MatchPreviewInput) => rulesService.previewMatch(input)

export const experience = (pathId: string, learnerCode: string, versionId?: string) =>
  rulesService.experience(pathId, learnerCode, versionId)

export const override = (
  viewer: Viewer,
  input: { enrolmentId: string; pathId: string; reason: string },
  requestId?: string,
) => rulesService.overridePath(viewer, input, requestId)
