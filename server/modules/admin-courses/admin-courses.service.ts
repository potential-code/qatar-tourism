import { db } from '@server/db/connection'
import {
  contentPackages,
  courses,
  learningPaths,
  pathItems,
  pathVersions,
  programmes,
  unitProgress,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import type { AdminCourseUpdateInput } from '@shared/schemas/admin-catalogue'
import { asc, count, eq, sql } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'

export async function listCourses() {
  const [courseRows, packages, progress, usage] = await Promise.all([
    db.select().from(courses).orderBy(asc(courses.code)),
    db.select().from(contentPackages).orderBy(asc(contentPackages.version)),
    db
      .select({
        courseId: unitProgress.courseId,
        started: count(),
        completed: sql<number>`count(*) filter (where ${unitProgress.status} = 'completed')::int`,
      })
      .from(unitProgress)
      .groupBy(unitProgress.courseId),
    db
      .selectDistinct({
        courseId: pathItems.courseId,
        path: learningPaths.name,
        programme: programmes.code,
        required: pathItems.required,
      })
      .from(pathItems)
      .innerJoin(pathVersions, eq(pathVersions.id, pathItems.pathVersionId))
      .innerJoin(learningPaths, eq(learningPaths.currentVersionId, pathVersions.id))
      .innerJoin(programmes, eq(programmes.id, learningPaths.programmeId)),
  ])
  return courseRows.map((course) => ({
    ...course,
    packages: packages.filter((p) => p.courseId === course.id),
    started: progress.find((p) => p.courseId === course.id)?.started ?? 0,
    completed: progress.find((p) => p.courseId === course.id)?.completed ?? 0,
    usedIn: usage
      .filter((u) => u.courseId === course.id)
      .map((u) => ({ path: u.path, programme: u.programme, required: u.required })),
  }))
}

export async function updateCourse(
  viewer: Viewer,
  courseId: string,
  input: AdminCourseUpdateInput,
  requestId?: string,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(courses).where(eq(courses.id, courseId)).limit(1)
    if (!before) throw HttpError.notFound('Course not found')
    await tx
      .update(courses)
      .set({ ...input, updatedAt: now() })
      .where(eq(courses.id, courseId))
    const keys = Object.keys(input) as (keyof AdminCourseUpdateInput)[]
    // Summaries only: a transcript can be long, so the audit records its length.
    const summarise = (source: Record<string, unknown>) =>
      Object.fromEntries(
        keys.map((k) => [
          k,
          k === 'transcript' ? `${String(source[k] ?? '').length} characters` : source[k],
        ]),
      )
    await recordAudit(
      viewer,
      {
        action: 'course.update',
        objectType: 'course',
        objectId: before.code,
        before: summarise(before),
        after: summarise(input),
      },
      tx,
      requestId,
    )
    return { updated: keys }
  })
}
