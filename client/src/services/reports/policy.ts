import { can, visibleLearnerFields } from '@shared/permissions'
import type { Role } from '@shared/roles'
import type { ReportColumn } from './types'

/**
 * Academy-wide reports are admin only (brief §11: admin "Authorised reports"; trainers are
 * limited to their own scope through the trainer workspace, not these endpoints).
 */
export const REPORT_ROLES: readonly Role[] = ['admin']

/** Who may export a report: the role needs personal-data export rights (brief §11). */
export const canExportReports = (role: Role) =>
  REPORT_ROLES.includes(role) && can(role, 'export.personal')

/**
 * Field permissions: a column tied to a learner field the role may not see is dropped. For an
 * admin that removes contact fields (email, mobile): "Controlled fields" in the §11 matrix.
 */
export function permittedColumns(role: Role, columns: readonly ReportColumn[]) {
  const allowed = new Set<string>(visibleLearnerFields(role))
  return columns.filter((column) => !column.field || allowed.has(column.field))
}
