import type {
  CreatePathInput,
  DraftItemsInput,
  MatchPreviewInput,
  PublishInput,
  RuleInput,
} from '@shared/schemas/admin-paths'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as rules from '@/services/admin/path-rules.service'
import * as paths from '@/services/admin/paths.service'

/** Learning path builder data (brief §14). The only place this feature calls a service. */

export const pathKeys = {
  all: ['admin-paths'] as const,
  list: () => ['admin-paths', 'list'] as const,
  catalogue: () => ['admin-paths', 'catalogue'] as const,
  detail: (pathId: string) => ['admin-paths', 'detail', pathId] as const,
  experience: (pathId: string, learnerCode: string, versionId?: string) =>
    ['admin-paths', 'experience', pathId, learnerCode, versionId ?? 'latest'] as const,
  preview: (input: MatchPreviewInput) => ['admin-paths', 'preview', input] as const,
}

export const pathsListQuery = () =>
  queryOptions({ queryKey: pathKeys.list(), queryFn: () => paths.listPaths() })

export const catalogueQuery = () =>
  queryOptions({
    queryKey: pathKeys.catalogue(),
    queryFn: () => paths.listCatalogue(),
    staleTime: 5 * 60_000,
  })

export const pathDetailQuery = (pathId: string) =>
  queryOptions({ queryKey: pathKeys.detail(pathId), queryFn: () => paths.getPath(pathId) })

export const experienceQuery = (pathId: string, learnerCode: string, versionId?: string) =>
  queryOptions({
    queryKey: pathKeys.experience(pathId, learnerCode, versionId),
    queryFn: () =>
      rules.getExperience(pathId, { learnerCode, ...(versionId ? { versionId } : {}) }),
    retry: false,
  })

export const matchPreviewQuery = (input: MatchPreviewInput) =>
  queryOptions({
    queryKey: pathKeys.preview(input),
    queryFn: () => rules.previewMatch(input),
    retry: false,
  })

function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: pathKeys.all })
}

export function useCreatePath() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: CreatePathInput) => paths.createPath(input),
    onSuccess: invalidate,
  })
}

export function useSetDefaultPath() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (pathId: string) => paths.updatePath(pathId, { isDefault: true }),
    onSuccess: invalidate,
  })
}

export function useStartDraft(pathId: string) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: () => paths.startDraft(pathId), onSuccess: invalidate })
}

export function useSaveDraft(pathId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: DraftItemsInput) => paths.saveDraft(pathId, input),
    onSuccess: invalidate,
  })
}

export function useDiscardDraft(pathId: string) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: () => paths.discardDraft(pathId), onSuccess: invalidate })
}

export function usePublishPath(pathId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: PublishInput) => paths.publishPath(pathId, input),
    onSuccess: invalidate,
  })
}

export function useSaveRule() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RuleInput }) =>
      id ? rules.updateRule(id, input) : rules.createRule(input),
    onSuccess: invalidate,
  })
}

export function useOverridePath() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { enrolmentId: string; pathId: string; reason: string }) =>
      rules.overridePath(input),
    onSuccess: invalidate,
  })
}
