import type { InferResponseType } from 'hono/client'
import type { adminApi } from '../hub/queries/admin-api'

type Programmes = typeof adminApi.programmes

export type ProgrammeSummary = InferResponseType<Programmes['$get'], 200>[number]
export type ProgrammeDetail = InferResponseType<Programmes[':programmeId']['$get'], 200>
