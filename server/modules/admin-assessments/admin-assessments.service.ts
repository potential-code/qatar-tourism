import { db } from '@server/db/connection'
import { assessmentAttempts, assessments } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import { asc, eq, sql } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'

export async function listAssessments() {
  return db
    .select({
      id: assessments.id,
      code: assessments.code,
      kind: assessments.kind,
      version: assessments.version,
      title: assessments.title,
      passPercent: assessments.passPercent,
      attempts: sql<number>`(select count(*)::int from ${assessmentAttempts} a where a.assessment_id = "assessments"."id" and a.status = 'submitted')`,
      average: sql<
        number | null
      >`(select round(avg(a.score))::int from ${assessmentAttempts} a where a.assessment_id = "assessments"."id" and a.status = 'submitted')`,
      passed: sql<number>`(select count(*)::int from ${assessmentAttempts} a where a.assessment_id = "assessments"."id"
        and a.status = 'submitted' and "assessments"."pass_percent" is not null and a.score >= "assessments"."pass_percent")`,
      updatedAt: assessments.updatedAt,
    })
    .from(assessments)
    .orderBy(asc(assessments.code))
}

export async function updatePassPercent(
  viewer: Viewer,
  assessmentId: string,
  passPercent: number | null,
  reason: string,
  requestId?: string,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(assessments)
      .where(eq(assessments.id, assessmentId))
      .limit(1)
    if (!before) throw HttpError.notFound('Assessment not found')
    if (before.passPercent === passPercent) throw HttpError.badRequest('The pass mark is unchanged')
    if (before.kind === 'pre' && passPercent !== null)
      throw HttpError.badRequest(
        'A baseline assessment records a starting point and has no pass mark',
      )
    await tx
      .update(assessments)
      .set({ passPercent, updatedAt: now() })
      .where(eq(assessments.id, assessmentId))
    await recordAudit(
      viewer,
      {
        action: 'assessment.update',
        objectType: 'assessment',
        objectId: `${before.code}`,
        before: { passPercent: before.passPercent, version: before.version },
        after: { passPercent, version: before.version },
        reason,
      },
      tx,
      requestId,
    )
    return { passPercent }
  })
}
