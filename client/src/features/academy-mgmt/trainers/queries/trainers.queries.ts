import type { ProgrammeCode } from '@shared/constants'
import type {
  AdminTrainerCreateInput,
  AdminTrainerUpdateInput,
} from '@shared/schemas/admin-trainers'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as trainers from '@/services/admin/trainers.service'

export type { TrainerDetail, TrainerListItem } from '@/services/admin/trainers.service'

export const trainerKeys = {
  all: ['admin', 'trainers'] as const,
  list: () => [...trainerKeys.all, 'list'] as const,
  detail: (id: string) => [...trainerKeys.all, 'detail', id] as const,
}

export const trainersQuery = () =>
  queryOptions({ queryKey: trainerKeys.list(), queryFn: () => trainers.listTrainers() })

export const trainerDetailQuery = (trainerId: string) =>
  queryOptions({
    queryKey: trainerKeys.detail(trainerId),
    queryFn: () => trainers.getTrainer(trainerId),
  })

function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['admin'] })
}

export function useCreateTrainer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: AdminTrainerCreateInput) => trainers.createTrainer(input),
    onSuccess: invalidate,
  })
}

export function useUpdateTrainer(trainerId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: AdminTrainerUpdateInput) => trainers.updateTrainer(trainerId, input),
    onSuccess: invalidate,
  })
}

export function useSetTrainerProgrammes(trainerId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { programmes: ProgrammeCode[]; reason: string }) =>
      trainers.setTrainerProgrammes(trainerId, input),
    onSuccess: invalidate,
  })
}
