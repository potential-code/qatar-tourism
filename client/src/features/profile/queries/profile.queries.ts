import type { OrganisationType, ProgrammeCode } from '@shared/constants'
import type { ProfileCompleteInput, ProfileDraftInput } from '@shared/schemas'
import type { ProfileUpdateInput } from '@shared/schemas/profile-account'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as organisations from '@/services/organisations.service'
import * as profiles from '@/services/profiles.service'

export type { OrganisationOption } from '@/services/organisations.service'
export type { OwnProfile, PathRevision } from '@/services/profiles.service'

export const profileKeys = {
  me: ['profile', 'me'] as const,
  organisations: (q: string, type?: OrganisationType) =>
    ['organisations', q, type ?? 'any'] as const,
}

export const ownProfileQuery = () =>
  queryOptions({
    queryKey: profileKeys.me,
    queryFn: profiles.getOwnProfile,
  })

export const organisationsQuery = (q: string, type?: OrganisationType) =>
  queryOptions({
    queryKey: profileKeys.organisations(q, type),
    queryFn: () =>
      organisations.searchOrganisations({ ...(q ? { q } : {}), ...(type ? { type } : {}) }),
    staleTime: 5 * 60_000,
  })

function useProfileMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.me })
      await queryClient.invalidateQueries({ queryKey: ['programmes'] })
    },
  })
}

export function useSaveDraft() {
  return useProfileMutation((input: ProfileDraftInput) => profiles.saveDraft(input))
}

export function useCompleteProfile() {
  return useProfileMutation((input: ProfileCompleteInput) => profiles.completeProfile(input))
}

export function useUpdateProfile() {
  return useProfileMutation((input: ProfileUpdateInput) => profiles.updateProfile(input))
}

export function useAcceptRevision() {
  return useProfileMutation((programme: ProgrammeCode) => profiles.acceptRevision(programme))
}
