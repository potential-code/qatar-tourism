import type { ProgrammeCode } from '@shared/constants'
import type { Unit } from '@/services/courses.service'
import type * as enrolments from '@/services/enrolments.service'
import type { getJourney } from '@/services/progress.service'

export type Journey = Awaited<ReturnType<typeof getJourney>>
export type JourneyItem = Journey['items'][number]
export type Enrolments = Awaited<ReturnType<typeof enrolments.listMine>>
export type EnrolmentSummary = Enrolments['items'][number]
export type { Unit }
export type UnitContent = Unit['content']

export type { ProgrammeCode }
