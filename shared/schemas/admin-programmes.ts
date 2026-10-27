import { z } from 'zod'
import { programmeUpdateInput } from './programme'

/** Programme management (brief §14). Certification is checked on the server, per programme. */
export const programmeIdParam = z.object({ programmeId: z.uuid() })

export const adminProgrammeUpdate = programmeUpdateInput.refine(
  (value) => Object.keys(value).length > 0,
  'Change at least one field',
)
export type AdminProgrammeUpdate = z.infer<typeof adminProgrammeUpdate>
