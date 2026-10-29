import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import { C01_SCENES, COURSE_BY_CODE } from '@shared/content/curriculum'
import { courseCodeParam, programmeQuery } from '@shared/schemas/learning-engine'
import { ApiError, db, delay, out, parseInput, requireRole } from './api'
import {
  C02_PREVIEW,
  C03_QUESTIONS,
  C03_TRANSCRIPT,
  C05_CHECKLIST,
  C05_MIN_DRAFT_WORDS,
  C07_PREVIEW,
  MEDIA,
} from './courses/unit-content'
import { requireUnitContext } from './progress/units'

/**
 * A unit as the learner sees it (brief §7), formerly server/modules/courses: the course, its
 * current package with an accurate format label, the in-unit activity and the learner's own
 * progress on it. Units are read in the context of the learner's own enrolment only.
 */

type Formative = Record<string, { option: string; correct: boolean }>

export async function getUnit(programme: ProgrammeCode, code: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(courseCodeParam, { code }, 'param')
  parseInput(programmeQuery, { programme }, 'query')
  const definition = COURSE_BY_CODE[code]
  if (!definition) throw ApiError.notFound('Unit not found')
  const course = db.courses.find((c) => c.code === code)
  if (!course) throw ApiError.notFound('Unit not found')
  const pkg = db.contentPackages.find((p) => p.courseId === course.id && p.isCurrent)

  const { unit } = requireUnitContext(learnerId, programme, code)
  const extra = unit?.extra ?? {}
  const completedUnit = unit?.status === 'completed'
  // Seeded history completed C03 without answer detail: show the questions as answered.
  const formative = (extra.formative ??
    (completedUnit
      ? Object.fromEntries(C03_QUESTIONS.map((q) => [q.id, { option: q.correct, correct: true }]))
      : {})) as Formative

  const content = (() => {
    switch (code) {
      case 'C01':
        return {
          kind: 'video' as const,
          media: MEDIA.C01,
          transcript: course.transcript ?? '',
          scenes: C01_SCENES.map((s) => s.caption),
          completeAtPercent: THRESHOLDS.videoCompletePercent,
          // Seeded history has no watch position; a completed unit counts as fully watched.
          watchedPercent: Math.max(Number(extra.videoPercent ?? 0), completedUnit ? 100 : 0),
          positionSeconds: Number(extra.positionSeconds ?? 0),
        }
      case 'C03':
        return {
          kind: 'video_questions' as const,
          media: MEDIA.C03,
          transcript: C03_TRANSCRIPT,
          watchedPercent: Math.max(Number(extra.videoPercent ?? 0), completedUnit ? 100 : 0),
          positionSeconds: Number(extra.positionSeconds ?? 0),
          questions: C03_QUESTIONS.map((q) => {
            const answer = formative[q.id]
            return {
              id: q.id,
              prompt: q.prompt,
              options: q.options,
              answered: answer
                ? {
                    option: answer.option,
                    correct: Boolean(answer.correct),
                    feedback: answer.correct ? q.feedback.correct : q.feedback.incorrect,
                  }
                : null,
            }
          }),
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

  return out({
    code: course.code,
    title: course.title,
    format: course.format,
    formatLabel: definition.formatLabel,
    durationMinutes: course.durationMinutes,
    summary: course.summary,
    completionText: course.completionText,
    package: pkg
      ? { type: pkg.type, version: pkg.version, label: pkg.formatLabel, launchUrl: pkg.launchUrl }
      : null,
    progress: {
      status: unit?.status ?? 'not_started',
      percent: unit?.percent ?? 0,
      scoreRaw: unit?.scoreRaw ?? null,
      completedAt: unit?.completedAt ?? null,
    },
    content,
  })
}

export type Unit = Awaited<ReturnType<typeof getUnit>>
