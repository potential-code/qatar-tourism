import type { Viewer } from '@server/middleware/auth.middleware'
import type { AdminCourseUpdateInput } from '@shared/schemas/admin-catalogue'
import * as service from './admin-courses.service'

export async function list() {
  const rows = await service.listCourses()
  return {
    items: rows.map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      format: row.format,
      durationMinutes: row.durationMinutes,
      summary: row.summary,
      completionRule: row.completionRule,
      completionText: row.completionText,
      transcript: row.transcript,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
      started: row.started,
      completed: row.completed,
      usedIn: row.usedIn,
      packages: row.packages.map((p) => ({
        id: p.id,
        type: p.type,
        version: p.version,
        title: p.title,
        launchUrl: p.launchUrl,
        formatLabel: p.formatLabel,
        isCurrent: p.isCurrent,
      })),
    })),
  }
}

export const update = (
  viewer: Viewer,
  courseId: string,
  input: AdminCourseUpdateInput,
  requestId?: string,
) => service.updateCourse(viewer, courseId, input, requestId)
