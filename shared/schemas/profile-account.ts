import { z } from 'zod'
import { PROGRAMME_CODES } from '../constants/enums'
import { profileStepGoals, profileStepLocale, profileStepWork } from './profile'

/**
 * Account and profile DTOs added in Phase 2 (agent A). Kept out of `profile.ts`, which is frozen.
 */

/** Simulated email verification (brief §3): a six-digit demo code shown in the demo inbox. */
export const verifySimulatedInput = z.object({
  email: z.email(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the six-digit code'),
})
export type VerifySimulatedInput = z.infer<typeof verifySimulatedInput>

export const resendSimulatedInput = z.object({ email: z.email() })

/** Learner edits on the Profile page: the wizard fields without the one-off consent. */
export const profileUpdateInput = profileStepWork
  .extend(profileStepLocale.shape)
  .extend(profileStepGoals.omit({ acceptTerms: true }).shape)
export type ProfileUpdateInput = z.infer<typeof profileUpdateInput>

/** Accept the revised recommended path offered after a role or organisation change (brief §4). */
export const pathRevisionInput = z.object({
  programme: z.enum(PROGRAMME_CODES),
})

/** Programme code in a URL, case-insensitive (`/programmes/a`). */
export const programmeCodeParam = z.object({
  code: z
    .string()
    .transform((value) => value.toUpperCase())
    .pipe(z.enum(PROGRAMME_CODES)),
})

/** Demo facilitator quick-switch targets (brief §3). Seeded demo accounts only. */
export const FACILITATOR_TARGETS = [
  // Learners in DEMO_LEARNERS order (shared/constants/demo-accounts.ts).
  'persona-36',
  'persona-1',
  'persona-2',
  'persona-3',
  'persona-4',
  'persona-5',
  'persona-42',
  'trainer-01',
  'trainer-02',
  'trainer-03',
  'trainer-04',
  'trainer-05',
  'trainer-06',
  'trainer-07',
  'trainer-08',
  'trainer-09',
  'trainer-10',
  'admin',
] as const
export type FacilitatorTarget = (typeof FACILITATOR_TARGETS)[number]

export const facilitatorSwitchInput = z.object({ target: z.enum(FACILITATOR_TARGETS) })
