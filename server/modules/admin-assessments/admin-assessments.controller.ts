import type { Viewer } from '@server/middleware/auth.middleware'
import * as service from './admin-assessments.service'

export async function list() {
  const rows = await service.listAssessments()
  return { items: rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })) }
}

export const updatePass = (
  viewer: Viewer,
  assessmentId: string,
  passPercent: number | null,
  reason: string,
  requestId?: string,
) => service.updatePassPercent(viewer, assessmentId, passPercent, reason, requestId)
