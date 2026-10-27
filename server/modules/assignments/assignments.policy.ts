import type { Role } from '@shared/roles'

/**
 * Who may call which assignment endpoints (brief §11). The role check is coarse; the record
 * check is the scope (`withScope` + `assertSubmissionInScope`) applied in the services:
 *
 * - Submit and upload: learners, on their own enrolments ("assignment.submit": own).
 * - Mark: trainers on submissions assigned to them, admins within the Academy
 *   ("marking.record": assigned / authorised).
 * - Download a stored file: the owning learner, the assigned trainer or an admin.
 */
export const SUBMIT_ROLES: readonly Role[] = ['learner']
export const MARKING_ROLES: readonly Role[] = ['trainer', 'admin']
export const FILE_ROLES: readonly Role[] = ['learner', 'trainer', 'admin']
