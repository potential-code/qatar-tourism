import { z } from 'zod'
import { ORGANISATION_TYPES } from '../constants/enums'

export const organisationView = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  type: z.enum(ORGANISATION_TYPES),
  city: z.string().nullable(),
})
export type OrganisationView = z.infer<typeof organisationView>

export const organisationSearchQuery = z.object({
  q: z.string().trim().max(80).optional(),
  type: z.enum(ORGANISATION_TYPES).optional(),
})
