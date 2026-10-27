import type { ProgrammeCode } from '@shared/constants'
import type {
  BranchingBody,
  FormativeAnswerBody,
  ResourceBody,
  VideoProgressBody,
} from '@shared/schemas/learning-engine'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export const learningKeys = {
  all: ['learning'] as const,
  enrolments: () => ['learning', 'enrolments'] as const,
  journey: (programme: ProgrammeCode) => ['learning', 'journey', programme] as const,
  unit: (programme: ProgrammeCode, code: string) => ['learning', 'unit', programme, code] as const,
}

export const enrolmentsQuery = () =>
  queryOptions({
    queryKey: learningKeys.enrolments(),
    queryFn: () => unwrap(api.enrolments.mine.$get()),
  })

export const journeyQuery = (programme: ProgrammeCode) =>
  queryOptions({
    queryKey: learningKeys.journey(programme),
    queryFn: () => unwrap(api.progress[':programme'].journey.$get({ param: { programme } })),
  })

export const unitQuery = (programme: ProgrammeCode, code: string) =>
  queryOptions({
    queryKey: learningKeys.unit(programme, code),
    queryFn: () => unwrap(api.courses[':code'].$get({ param: { code }, query: { programme } })),
  })

/** Any learning write can move the journey, assessments, progress and certificates. */
export function useInvalidateLearning() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      ['learning', 'assessments', 'progress', 'certificates', 'ai-path'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    )
}

export function useVideoProgress() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (body: VideoProgressBody) => unwrap(api.progress.video.$post({ json: body })),
    onSuccess: (result) => {
      if (result.completedNow) void invalidate()
    },
  })
}

export function useBranchingResult() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (body: BranchingBody) => unwrap(api.progress.branching.$post({ json: body })),
    onSuccess: () => void invalidate(),
  })
}

export function useFormativeAnswer() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (body: FormativeAnswerBody) => unwrap(api.progress.formative.$post({ json: body })),
    onSuccess: () => void invalidate(),
  })
}

export function useSaveResource() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (body: ResourceBody) => unwrap(api.progress.resource.$post({ json: body })),
    onSuccess: () => void invalidate(),
  })
}

export function usePreviewViewed() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (programme: ProgrammeCode) =>
      unwrap(api.progress.preview.$post({ json: { programme } })),
    onSuccess: () => void invalidate(),
  })
}
