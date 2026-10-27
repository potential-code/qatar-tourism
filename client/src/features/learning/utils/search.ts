import { z } from 'zod'

/** `?programme=A|B|C` on every learner page: the explicit programme switcher (brief §5). */
export const programmeSearch = z.object({ programme: z.enum(['A', 'B', 'C']).optional() })
export type ProgrammeSearch = z.infer<typeof programmeSearch>
