import type { RegisterInput } from '@shared/schemas'
import { useMutation } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '@/lib/api'

export type RegisterResult = InferResponseType<typeof api.profiles.register.$post, 201>
export type SimulatedEmail = RegisterResult['simulatedEmail']

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => unwrap(api.profiles.register.$post({ json: input })),
  })
}

export function useVerifySimulated() {
  return useMutation({
    mutationFn: (input: { email: string; code: string }) =>
      unwrap(api.profiles.register.verify.$post({ json: input })),
  })
}

export function useResendSimulated() {
  return useMutation({
    mutationFn: (email: string) => unwrap(api.profiles.register.resend.$post({ json: { email } })),
  })
}

export function useSimulatedSso() {
  return useMutation({
    mutationFn: (provider: 'qatar-tourism' | 'organisation') =>
      unwrap(api.profiles.sso.simulated.$post({ json: { provider } })),
  })
}
