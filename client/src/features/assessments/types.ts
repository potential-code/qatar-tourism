import type * as assessments from '@/services/assessments.service'

export type AssessmentsOverview = Awaited<ReturnType<typeof assessments.overview>>
export type AssessmentState = Awaited<ReturnType<typeof assessments.getState>>
export type AssessmentResult = NonNullable<AssessmentState['lastResult']>
export type OpenAttempt = NonNullable<AssessmentState['attempt']>
