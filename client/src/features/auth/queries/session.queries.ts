import { queryOptions, useMutation } from '@tanstack/react-query'
import * as auth from '@/services/auth.service'

/** Email and password sign-in. Errors are ApiErrors (401 INVALID_CREDENTIALS, 403 …). */
export function useSignIn() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      auth.signIn(email, password),
  })
}

/** The signed-in learner's profile status, read once after sign-in (never cached). */
export const ownProfileStatusQuery = () =>
  queryOptions({
    queryKey: ['profile', 'status'],
    queryFn: auth.getOwnProfileStatus,
    staleTime: 0,
  })
