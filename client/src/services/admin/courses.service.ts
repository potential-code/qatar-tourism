import {
  type AdminCourseUpdateInput,
  adminCourseUpdateInput,
  courseIdParam,
} from '@shared/schemas/admin-catalogue'
import {
  commit,
  db,
  delay,
  findOr404,
  indexBy,
  out,
  parseInput,
  requireRole,
  updateRow,
} from '../api'
import { audit } from '../audit.service'

/**
 * Course and content management (brief §14), formerly /api/admin/courses. Admin only. Content
 * packages are listed read-only; summary, completion text and transcript are editable and
 * every edit is audited.
 */

/** Paths whose CURRENT version uses each course, deduplicated (the old `select distinct`). */
function usage() {
  const programmes = indexBy(db.programmes, (p) => p.id)
  const byVersion = new Map(
    db.learningPaths
      .filter((p) => p.currentVersionId)
      .map((p) => [p.currentVersionId as string, p]),
  )
  const seen = new Set<string>()
  const rows: { courseId: string; path: string; programme: string; required: boolean }[] = []
  for (const item of db.pathItems) {
    const path = byVersion.get(item.pathVersionId)
    const programme = path ? programmes.get(path.programmeId) : undefined
    if (!item.courseId || !path || !programme) continue
    const key = `${item.courseId}|${path.name}|${programme.code}|${item.required}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      courseId: item.courseId,
      path: path.name,
      programme: programme.code,
      required: item.required,
    })
  }
  return rows
}

export async function listCourses() {
  await delay()
  requireRole('admin')
  const used = usage()
  const items = [...db.courses]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((course) => {
      const progress = db.unitProgress.filter((u) => u.courseId === course.id)
      return {
        id: course.id,
        code: course.code,
        title: course.title,
        format: course.format,
        durationMinutes: course.durationMinutes,
        summary: course.summary,
        completionRule: course.completionRule,
        completionText: course.completionText,
        transcript: course.transcript,
        isActive: course.isActive,
        updatedAt: course.updatedAt,
        started: progress.length,
        completed: progress.filter((u) => u.status === 'completed').length,
        usedIn: used
          .filter((u) => u.courseId === course.id)
          .map((u) => ({ path: u.path, programme: u.programme, required: u.required })),
        packages: db.contentPackages
          .filter((p) => p.courseId === course.id)
          .sort((a, b) => a.version.localeCompare(b.version))
          .map((p) => ({
            id: p.id,
            type: p.type,
            version: p.version,
            title: p.title,
            launchUrl: p.launchUrl,
            formatLabel: p.formatLabel,
            isCurrent: p.isCurrent,
          })),
      }
    })
  return out({ items })
}

export async function updateCourse(courseId: string, input: AdminCourseUpdateInput) {
  await delay()
  requireRole('admin')
  parseInput(courseIdParam, { courseId }, 'param')
  const data = parseInput(adminCourseUpdateInput, input)
  const course = findOr404(db.courses, (c) => c.id === courseId, 'Course not found')
  const keys = Object.keys(data) as (keyof AdminCourseUpdateInput)[]
  // Summaries only: a transcript can be long, so the audit records its length.
  const summarise = (source: Record<string, unknown>) =>
    Object.fromEntries(
      keys.map((k) => [
        k,
        k === 'transcript' ? `${String(source[k] ?? '').length} characters` : source[k],
      ]),
    )
  const before = summarise({ ...course })
  updateRow(course, data)
  audit({
    action: 'course.update',
    objectType: 'course',
    objectId: course.code,
    before,
    after: summarise(data),
  })
  commit()
  return { updated: keys }
}

export type CourseItem = Awaited<ReturnType<typeof listCourses>>['items'][number]
