import type { MyAssignments } from '@/services/assignments.service'

export type { MyAssignments }
export type LearnerAssignment = MyAssignments['items'][number]
export type AssignmentVersion = LearnerAssignment['versions'][number]
export type VersionReview = NonNullable<AssignmentVersion['review']>
export type VersionFile = NonNullable<AssignmentVersion['file']>
export type RubricItem = LearnerAssignment['assignment']['rubric'][number]
export type UploadLimits = MyAssignments['limits']
