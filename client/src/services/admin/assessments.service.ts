import { adminAssessmentUpdateInput, assessmentIdParam } from '@shared/schemas/admin-catalogue'
import type { z } from 'zod'
import {
  ApiError,
  commit,
  db,
  delay,
  findOr404,
  out,
  parseInput,
  requireRole,
  updateRow,
} from '../api'
import { audit } from '../audit.service'

/**
 * Assessment and rubric management (brief §14), formerly /api/admin/assessments. Admin only.
 * Shows submitted-attempt statistics; the pass mark is editable with a reason, audited.
 */

export async function listAssessments() {
  await delay()
  requireRole('admin')
  const items = [...db.assessments]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((assessment) => {
      const submitted = db.assessmentAttempts.filter(
        (a) => a.assessmentId === assessment.id && a.status === 'submitted',
      )
      const scores = submitted.map((a) => a.score).filter((s): s is number => s !== null)
      const pass = assessment.passPercent
      return {
        id: assessment.id,
        code: assessment.code,
        kind: assessment.kind,
        version: assessment.version,
        title: assessment.title,
        passPercent: pass,
        attempts: submitted.length,
        // round(avg(score)) as the old query did: null when nothing has been scored.
        average: scores.length
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
          : null,
        passed: pass === null ? 0 : scores.filter((s) => s >= pass).length,
        updatedAt: assessment.updatedAt,
      }
    })
  return out({ items })
}

export async function updatePassMark(
  assessmentId: string,
  input: z.input<typeof adminAssessmentUpdateInput>,
) {
  await delay()
  requireRole('admin')
  parseInput(assessmentIdParam, { assessmentId }, 'param')
  const { passPercent, reason } = parseInput(adminAssessmentUpdateInput, input)
  const assessment = findOr404(db.assessments, (a) => a.id === assessmentId, 'Assessment not found')
  if (assessment.passPercent === passPercent)
    throw ApiError.badRequest('The pass mark is unchanged')
  if (assessment.kind === 'pre' && passPercent !== null)
    throw ApiError.badRequest('A baseline assessment records a starting point and has no pass mark')
  const before = { passPercent: assessment.passPercent, version: assessment.version }
  updateRow(assessment, { passPercent })
  audit({
    action: 'assessment.update',
    objectType: 'assessment',
    objectId: assessment.code,
    before,
    after: { passPercent, version: assessment.version },
    reason,
  })
  commit()
  return { passPercent }
}

export type AssessmentItem = Awaited<ReturnType<typeof listAssessments>>['items'][number]
