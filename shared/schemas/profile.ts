import { z } from 'zod'
import {
  EXPERIENCE_BANDS,
  JOB_FUNCTIONS,
  LEARNING_GOALS,
  ORGANISATION_TYPES,
  SENIORITY_LEVELS,
  WEEKLY_MINUTES,
} from '../constants/enums'

/** Registration (brief §3–4): short initial form, then a three-step profile wizard. */
export const registerInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(8).max(128),
  /** Programme the visitor was viewing; B by default (brief §3). */
  programme: z.enum(['A', 'B', 'C']).default('B'),
})
export type RegisterInput = z.infer<typeof registerInput>

const weeklyMinutes = z.union(
  WEEKLY_MINUTES.map((m) => z.literal(m)) as [z.ZodLiteral<number>, ...z.ZodLiteral<number>[]],
)

/** Wizard step 1: work. */
export const profileStepWork = z.object({
  organisationId: z.uuid().nullable(),
  organisationOther: z.string().trim().max(120).nullable().optional(),
  organisationType: z.enum(ORGANISATION_TYPES),
  jobTitle: z.string().trim().min(2).max(120),
  jobFunction: z.enum(JOB_FUNCTIONS),
  seniority: z.enum(SENIORITY_LEVELS),
  experience: z.enum(EXPERIENCE_BANDS),
})

/** Wizard step 2: where and how. */
export const profileStepLocale = z.object({
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().max(80).optional(),
  preferredLanguage: z.string().trim().min(2).max(40),
  captionsPreference: z.boolean().optional(),
  accessibilityRequest: z.string().trim().max(500).optional(),
})

/** Wizard step 3: goals, availability, optional contact and consent. */
export const profileStepGoals = z.object({
  goals: z.array(z.enum(LEARNING_GOALS)).min(1).max(3),
  weeklyMinutes,
  mobile: z.string().trim().max(30).optional(),
  acceptTerms: z.literal(true),
  marketingOptIn: z.boolean().default(false),
})

export const profileDraftInput = z.object({
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ...profileStepWork.partial().shape,
  ...profileStepLocale.partial().shape,
  ...profileStepGoals.partial().omit({ acceptTerms: true }).shape,
})
export type ProfileDraftInput = z.infer<typeof profileDraftInput>

export const profileCompleteInput = profileStepWork
  .extend(profileStepLocale.shape)
  .extend(profileStepGoals.shape)
export type ProfileCompleteInput = z.infer<typeof profileCompleteInput>

/** What a trainer may see of a learner: ID and permitted display name only (brief §11). */
export const trainerLearnerView = z.object({
  learnerCode: z.string(),
  displayName: z.string(),
})
export type TrainerLearnerView = z.infer<typeof trainerLearnerView>

export const profileView = z.object({
  learnerCode: z.string(),
  displayName: z.string(),
  email: z.string(),
  organisationName: z.string().nullable(),
  organisationType: z.enum(ORGANISATION_TYPES).nullable(),
  jobTitle: z.string().nullable(),
  jobFunction: z.enum(JOB_FUNCTIONS).nullable(),
  seniority: z.enum(SENIORITY_LEVELS).nullable(),
  experience: z.enum(EXPERIENCE_BANDS).nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  preferredLanguage: z.string().nullable(),
  goals: z.array(z.string()),
  weeklyMinutes: z.number().nullable(),
  status: z.enum(['draft', 'complete']),
  wizardStep: z.number(),
  completeness: z.number(),
})
export type ProfileView = z.infer<typeof profileView>
