import type {
  CreatePathInput,
  DraftItemsInput,
  MatchPreviewInput,
  PublishInput,
  RuleInput,
} from '@shared/schemas/admin-paths'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { unwrap } from '@/lib/api'
import { adminApi } from '../../hub/queries/admin-api'

/** Learning path builder data (brief §14). The only place this feature calls the API. */

const paths = adminApi.paths

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
  queryOptions({ queryKey: pathKeys.list(), queryFn: () => unwrap(paths.$get()) })

export const catalogueQuery = () =>
  queryOptions({
    queryKey: pathKeys.catalogue(),
    queryFn: () => unwrap(paths.catalogue.$get()),
    staleTime: 5 * 60_000,
  })

export const pathDetailQuery = (pathId: string) =>
  queryOptions({
    queryKey: pathKeys.detail(pathId),
    queryFn: () => unwrap(paths[':pathId'].$get({ param: { pathId } })),
  })

export const experienceQuery = (pathId: string, learnerCode: string, versionId?: string) =>
  queryOptions({
    queryKey: pathKeys.experience(pathId, learnerCode, versionId),
    queryFn: () =>
      unwrap(
        paths[':pathId'].experience.$get({
          param: { pathId },
          query: { learnerCode, ...(versionId ? { versionId } : {}) },
        }),
      ),
    retry: false,
  })

export const matchPreviewQuery = (input: MatchPreviewInput) =>
  queryOptions({
    queryKey: pathKeys.preview(input),
    queryFn: () => unwrap(paths.preview.$post({ json: input })),
    retry: false,
  })

function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: pathKeys.all })
}

export function useCreatePath() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: CreatePathInput) => unwrap(paths.$post({ json: input })),
    onSuccess: invalidate,
  })
}

export function useSetDefaultPath() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (pathId: string) =>
      unwrap(paths[':pathId'].$patch({ param: { pathId }, json: { isDefault: true } })),
    onSuccess: invalidate,
  })
}

export function useStartDraft(pathId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: () => unwrap(paths[':pathId'].draft.$post({ param: { pathId } })),
    onSuccess: invalidate,
  })
}

export function useSaveDraft(pathId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: DraftItemsInput) =>
      unwrap(paths[':pathId'].draft.$patch({ param: { pathId }, json: input })),
    onSuccess: invalidate,
  })
}

export function useDiscardDraft(pathId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: () => unwrap(paths[':pathId'].draft.$delete({ param: { pathId } })),
    onSuccess: invalidate,
  })
}

export function usePublishPath(pathId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: PublishInput) =>
      unwrap(paths[':pathId'].publish.$post({ param: { pathId }, json: input })),
    onSuccess: invalidate,
  })
}

export function useSaveRule() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RuleInput }) =>
      id
        ? unwrap(paths.rules[':ruleId'].$patch({ param: { ruleId: id }, json: input }))
        : unwrap(paths.rules.$post({ json: input })),
    onSuccess: invalidate,
  })
}

export function useOverridePath() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { enrolmentId: string; pathId: string; reason: string }) =>
      unwrap(paths.override.$post({ json: input })),
    onSuccess: invalidate,
  })
}
