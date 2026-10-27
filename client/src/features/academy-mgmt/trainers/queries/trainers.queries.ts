import type { ProgrammeCode } from '@shared/constants'
import type {
  AdminTrainerCreateInput,
  AdminTrainerUpdateInput,
} from '@shared/schemas/admin-trainers'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { unwrap } from '@/lib/api'
import { adminApi } from '../../hub/queries/admin-api'

export const trainerKeys = {
  all: ['admin', 'trainers'] as const,
  list: () => [...trainerKeys.all, 'list'] as const,
  detail: (id: string) => [...trainerKeys.all, 'detail', id] as const,
}

export const trainersQuery = () =>
  queryOptions({ queryKey: trainerKeys.list(), queryFn: () => unwrap(adminApi.trainers.$get()) })

export const trainerDetailQuery = (trainerId: string) =>
  queryOptions({
    queryKey: trainerKeys.detail(trainerId),
    queryFn: () => unwrap(adminApi.trainers[':trainerId'].$get({ param: { trainerId } })),
  })

export type TrainerListItem = Awaited<
  ReturnType<NonNullable<ReturnType<typeof trainersQuery>['queryFn']>>
>['items'][number]
export type TrainerDetail = Awaited<
  ReturnType<NonNullable<ReturnType<typeof trainerDetailQuery>['queryFn']>>
>

function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['admin'] })
}

export function useCreateTrainer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: AdminTrainerCreateInput) =>
      unwrap(adminApi.trainers.$post({ json: input })),
    onSuccess: invalidate,
  })
}

export function useUpdateTrainer(trainerId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: AdminTrainerUpdateInput) =>
      unwrap(adminApi.trainers[':trainerId'].$patch({ param: { trainerId }, json: input })),
    onSuccess: invalidate,
  })
}

export function useSetTrainerProgrammes(trainerId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { programmes: ProgrammeCode[]; reason: string }) =>
      unwrap(
        adminApi.trainers[':trainerId'].programmes.$put({ param: { trainerId }, json: input }),
      ),
    onSuccess: invalidate,
  })
}
