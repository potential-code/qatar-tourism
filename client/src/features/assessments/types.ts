import type { ApiJson } from '@/features/learning/types'
import type { api } from '@/lib/api'

export type AssessmentsOverview = ApiJson<(typeof api.assessments)[':programme']['$get']>
export type AssessmentState = ApiJson<(typeof api.assessments)[':programme'][':kind']['$get']>
export type AssessmentResult = NonNullable<AssessmentState['lastResult']>
export type OpenAttempt = NonNullable<AssessmentState['attempt']>
