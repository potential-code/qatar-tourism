import type { InferResponseType } from 'hono/client'
import type { api } from '@/lib/api'

export type MyAssignments = InferResponseType<typeof api.assignments.mine.$get, 200>
export type LearnerAssignment = MyAssignments['items'][number]
export type AssignmentVersion = LearnerAssignment['versions'][number]
export type VersionReview = NonNullable<AssignmentVersion['review']>
export type VersionFile = NonNullable<AssignmentVersion['file']>
export type RubricItem = LearnerAssignment['assignment']['rubric'][number]
export type UploadLimits = MyAssignments['limits']
