import { z } from 'zod'
import {
  EXPERIENCE_BANDS,
  JOB_FUNCTIONS,
  PROGRAMME_CODES,
  SENIORITY_LEVELS,
} from '../constants/enums'
import { ROLES } from '../roles'

/** Fictional accounts only (brief §15): every address ends in example.com. */
const demoEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .refine(
    (value) => value.endsWith('@example.com'),
    'Use a fictional address ending in example.com',
  )

export const adminUserListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [25, 50, 100].includes(n), 'Page size must be 25, 50 or 100')
    .default(25),
  search: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'suspended', 'invited']).optional(),
  programme: z.enum(PROGRAMME_CODES).optional(),
})
export type AdminUserListQuery = z.infer<typeof adminUserListQuery>

const profileFields = {
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  organisationId: z.uuid().nullable(),
  jobTitle: z.string().trim().max(120).nullable(),
  jobFunction: z.enum(JOB_FUNCTIONS).nullable(),
  seniority: z.enum(SENIORITY_LEVELS).nullable(),
  experience: z.enum(EXPERIENCE_BANDS).nullable(),
}

export const adminUserCreateInput = z.object({
  ...profileFields,
  email: demoEmail,
  /** Send the invitation through the demo notification log (simulated email, never sent). */
  invite: z.boolean().default(true),
  /** Optional first enrolment. */
  programme: z.enum(PROGRAMME_CODES).nullable().default(null),
})
export type AdminUserCreateInput = z.infer<typeof adminUserCreateInput>

export const adminUserUpdateInput = z.object(profileFields).partial()
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateInput>

export const adminReasonInput = z.object({
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters').max(300),
})

export const adminEnrolInput = z.object({ programme: z.enum(PROGRAMME_CODES) })

export const adminRoleInput = z.object({
  role: z.enum(ROLES),
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters').max(300),
})

export const userIdParam = z.object({ userId: z.string().min(1).max(80) })
