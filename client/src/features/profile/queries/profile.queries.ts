import type { OrganisationType, ProgrammeCode } from '@shared/constants'
import type { ProfileCompleteInput, ProfileDraftInput } from '@shared/schemas'
import type { ProfileUpdateInput } from '@shared/schemas/profile-account'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '@/lib/api'

export type OwnProfile = InferResponseType<typeof api.profiles.me.$get, 200>
export type PathRevision = OwnProfile['revisions'][number]
export type OrganisationOption = InferResponseType<
  typeof api.organisations.$get,
  200
>['items'][number]

export const profileKeys = {
  me: ['profile', 'me'] as const,
  organisations: (q: string, type?: OrganisationType) =>
    ['organisations', q, type ?? 'any'] as const,
}

export const ownProfileQuery = () =>
  queryOptions({
    queryKey: profileKeys.me,
    queryFn: () => unwrap(api.profiles.me.$get()),
  })

export const organisationsQuery = (q: string, type?: OrganisationType) =>
  queryOptions({
    queryKey: profileKeys.organisations(q, type),
    queryFn: async () =>
      (
        await unwrap(
          api.organisations.$get({ query: { ...(q ? { q } : {}), ...(type ? { type } : {}) } }),
        )
      ).items,
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
  return useProfileMutation((input: ProfileDraftInput) =>
    unwrap(api.profiles.me.draft.$patch({ json: input })),
  )
}

export function useCompleteProfile() {
  return useProfileMutation((input: ProfileCompleteInput) =>
    unwrap(api.profiles.me.complete.$post({ json: input })),
  )
}

export function useUpdateProfile() {
  return useProfileMutation((input: ProfileUpdateInput) =>
    unwrap(api.profiles.me.$patch({ json: input })),
  )
}

export function useAcceptRevision() {
  return useProfileMutation((programme: ProgrammeCode) =>
    unwrap(api.profiles.me['path-revision'].$post({ json: { programme } })),
  )
}
