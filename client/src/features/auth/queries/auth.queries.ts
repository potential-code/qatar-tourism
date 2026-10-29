import type { RegisterInput } from '@shared/schemas'
import { useMutation } from '@tanstack/react-query'
import * as passwordReset from '@/services/password-reset.service'
import * as registration from '@/services/registration.service'
import * as sso from '@/services/sso.service'

export type RegisterResult = Awaited<ReturnType<typeof registration.register>>
export type SimulatedEmail = RegisterResult['simulatedEmail']
export type ResetEmail = passwordReset.ResetEmail

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => registration.register(input),
  })
}

export function useVerifySimulated() {
  return useMutation({
    mutationFn: (input: { email: string; code: string }) => registration.verifySimulated(input),
  })
}

export function useResendSimulated() {
  return useMutation({
    mutationFn: (email: string) => registration.resendSimulated(email),
  })
}

export function useSimulatedSso() {
  return useMutation({
    mutationFn: (provider: sso.SsoProvider) => sso.signInSimulated(provider),
  })
}

/** Simulated "forgot password": the reset link appears in a demo inbox. */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => passwordReset.requestPasswordReset(email),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; newPassword: string }) =>
      passwordReset.resetPassword(input),
  })
}
