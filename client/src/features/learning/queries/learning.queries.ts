import type { ProgrammeCode } from '@shared/constants'
import type {
  BranchingBody,
  FormativeAnswerBody,
  ResourceBody,
  VideoProgressBody,
} from '@shared/schemas/learning-engine'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as courses from '@/services/courses.service'
import * as enrolments from '@/services/enrolments.service'
import * as progress from '@/services/progress.service'

export const learningKeys = {
  all: ['learning'] as const,
  enrolments: () => ['learning', 'enrolments'] as const,
  journey: (programme: ProgrammeCode) => ['learning', 'journey', programme] as const,
  unit: (programme: ProgrammeCode, code: string) => ['learning', 'unit', programme, code] as const,
}

export const enrolmentsQuery = () =>
  queryOptions({
    queryKey: learningKeys.enrolments(),
    queryFn: () => enrolments.listMine(),
  })

export const journeyQuery = (programme: ProgrammeCode) =>
  queryOptions({
    queryKey: learningKeys.journey(programme),
    queryFn: () => progress.getJourney(programme),
  })

export const unitQuery = (programme: ProgrammeCode, code: string) =>
  queryOptions({
    queryKey: learningKeys.unit(programme, code),
    queryFn: () => courses.getUnit(programme, code),
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
    mutationFn: (body: VideoProgressBody) => progress.recordVideo(body),
    onSuccess: (result) => {
      if (result.completedNow) void invalidate()
    },
  })
}

export function useBranchingResult() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (body: BranchingBody) => progress.recordBranching(body),
    onSuccess: () => void invalidate(),
  })
}

export function useFormativeAnswer() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (body: FormativeAnswerBody) => progress.answerFormative(body),
    onSuccess: () => void invalidate(),
  })
}

export function useSaveResource() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (body: ResourceBody) => progress.saveResource(body),
    onSuccess: () => void invalidate(),
  })
}

export function usePreviewViewed() {
  const invalidate = useInvalidateLearning()
  return useMutation({
    mutationFn: (programme: ProgrammeCode) => progress.recordPreviewViewed(programme),
    onSuccess: () => void invalidate(),
  })
}
