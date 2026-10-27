import { db } from '@server/db/connection'
import { contentPackages, courses } from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import { requireUnitContext } from '@server/modules/progress/progress.units'
import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import { C01_SCENES, COURSE_BY_CODE } from '@shared/content/curriculum'
import { and, eq } from 'drizzle-orm'
import {
  C02_PREVIEW,
  C03_QUESTIONS,
  C03_TRANSCRIPT,
  C05_CHECKLIST,
  C05_MIN_DRAFT_WORDS,
  C07_PREVIEW,
  MEDIA,
} from './unit-content'

/**
 * A unit as the learner sees it (brief §7): the course, its current package with an accurate
 * format label, the in-unit activity and the learner's own progress on it.
 */
export async function getUnit(learnerId: string, programme: ProgrammeCode, code: string) {
  const definition = COURSE_BY_CODE[code]
  if (!definition) throw HttpError.notFound('Unit not found')

  const [row] = await db
    .select({
      code: courses.code,
      title: courses.title,
      format: courses.format,
      durationMinutes: courses.durationMinutes,
      summary: courses.summary,
      completionText: courses.completionText,
      transcript: courses.transcript,
      packageType: contentPackages.type,
      packageVersion: contentPackages.version,
      packageLabel: contentPackages.formatLabel,
      launchUrl: contentPackages.launchUrl,
    })
    .from(courses)
    .leftJoin(
      contentPackages,
      and(eq(contentPackages.courseId, courses.id), eq(contentPackages.isCurrent, true)),
    )
    .where(eq(courses.code, code))
    .limit(1)
  if (!row) throw HttpError.notFound('Unit not found')

  const { unit } = await db.transaction((tx) => requireUnitContext(tx, learnerId, programme, code))
  const extra = (unit?.extra ?? {}) as Record<string, unknown>
  const formative = (extra.formative ?? {}) as Record<string, { option: string; correct: boolean }>

  const content = (() => {
    switch (code) {
      case 'C01':
        return {
          kind: 'video' as const,
          media: MEDIA.C01,
          transcript: row.transcript ?? '',
          scenes: C01_SCENES.map((s) => s.caption),
          completeAtPercent: THRESHOLDS.videoCompletePercent,
          // Seeded history has no watch position; a completed unit counts as fully watched.
          watchedPercent: Math.max(
            Number(extra.videoPercent ?? 0),
            unit?.status === 'completed' ? 100 : 0,
          ),
          positionSeconds: Number(extra.positionSeconds ?? 0),
        }
      case 'C03':
        return {
          kind: 'video_questions' as const,
          media: MEDIA.C03,
          transcript: C03_TRANSCRIPT,
          watchedPercent: Number(extra.videoPercent ?? 0),
          positionSeconds: Number(extra.positionSeconds ?? 0),
          questions: C03_QUESTIONS.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            options: q.options,
            answered: formative[q.id]
              ? {
                  option: formative[q.id]?.option ?? '',
                  correct: Boolean(formative[q.id]?.correct),
                  feedback: formative[q.id]?.correct ? q.feedback.correct : q.feedback.incorrect,
                }
              : null,
          })),
        }
      case 'C02':
        return {
          kind: 'branching' as const,
          preview: C02_PREVIEW,
          bestScore: unit?.scoreRaw ?? null,
          attempts: Number(extra.attempts ?? 0),
        }
      case 'C04':
        return { kind: 'scorm' as const }
      case 'C05':
        return {
          kind: 'resource' as const,
          checklist: C05_CHECKLIST,
          minDraftWords: C05_MIN_DRAFT_WORDS,
          saved: {
            checklist: (extra.checklist ?? []) as string[],
            draft: String(extra.draft ?? ''),
          },
          completesOnApproval: programme === 'B',
        }
      case 'C06':
        return { kind: 'session' as const }
      default:
        return { kind: 'preview' as const, preview: C07_PREVIEW }
    }
  })()

  return {
    code: row.code,
    title: row.title,
    format: row.format,
    formatLabel: definition.formatLabel,
    durationMinutes: row.durationMinutes,
    summary: row.summary,
    completionText: row.completionText,
    package: row.packageType
      ? {
          type: row.packageType,
          version: row.packageVersion,
          label: row.packageLabel,
          launchUrl: row.launchUrl,
        }
      : null,
    progress: {
      status: unit?.status ?? 'not_started',
      percent: unit?.percent ?? 0,
      scoreRaw: unit?.scoreRaw ?? null,
      completedAt: unit?.completedAt?.toISOString() ?? null,
    },
    content,
  }
}
