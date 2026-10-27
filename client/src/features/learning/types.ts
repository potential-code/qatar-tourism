import type { ProgrammeCode } from '@shared/constants'
import type { api } from '@/lib/api'

/** The success JSON of a typed RPC call. */
export type ApiJson<T> = T extends (...args: never[]) => Promise<infer R>
  ? R extends { json: () => Promise<infer J> }
    ? J
    : never
  : never

export type Journey = ApiJson<(typeof api.progress)[':programme']['journey']['$get']>
export type JourneyItem = Journey['items'][number]
export type Enrolments = ApiJson<(typeof api.enrolments.mine)['$get']>
export type EnrolmentSummary = Enrolments['items'][number]
export type Unit = ApiJson<(typeof api.courses)[':code']['$get']>
export type UnitContent = Unit['content']

export type { ProgrammeCode }
