import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import {
  courseCodeParam,
  programmeQuery,
  type ScormCommitBody,
  scormCommitBody,
  scormRestartBody,
} from '@shared/schemas/learning-engine'
import { ApiError, db, delay, out, parseInput, requireRole, commit as save } from './api'
import { recomputeEnrolment } from './progress/recompute'
import { requireUnitContext, writeUnit } from './progress/units'

/**
 * SCORM 2004 runtime persistence for the sample package (brief §8), formerly
 * server/modules/scorm. The page runs scorm-again; this service stores the CMI fields on the
 * unit progress row, maps the outcome to the unit and the enrolment, and counts a reported pass
 * exactly once. The signed-in learner's own attempt only.
 */

const MAX_LAUNCHES = 50

/** The current SCORM 2004 package behind a course. Only SCORM packages have a runtime. */
function scormPackage(code: string) {
  const course = db.courses.find((c) => c.code === code)
  const pkg = course
    ? db.contentPackages.find((p) => p.courseId === course.id && p.isCurrent)
    : undefined
  if (pkg?.type !== 'scorm_2004' || !pkg.launchUrl) {
    throw ApiError.notFound('No SCORM package for this unit')
  }
  return {
    title: pkg.title,
    type: pkg.type,
    version: pkg.version,
    launchUrl: pkg.launchUrl,
    formatLabel: pkg.formatLabel,
  }
}

const sceneNumber = (location: string | null | undefined) => {
  const match = /scene-(\d+)/.exec(location ?? '')
  return match ? Number(match[1]) : 0
}

/** CMI values to initialise the runtime with, so closing and reopening resumes (brief §8). */
export async function getState(programme: ProgrammeCode, code: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(courseCodeParam, { code }, 'param')
  parseInput(programmeQuery, { programme }, 'query')
  const pkg = scormPackage(code)
  const { unit } = requireUnitContext(learnerId, programme, code)
  const resumable = Boolean(unit?.location || unit?.suspendData)
  return out({
    package: pkg,
    cmi: {
      entry: resumable ? ('resume' as const) : ('ab-initio' as const),
      location: unit?.location ?? '',
      suspendData: unit?.suspendData ?? '',
      completionStatus: unit?.cmiCompletionStatus ?? 'not attempted',
      successStatus: unit?.cmiSuccessStatus ?? 'unknown',
      scoreRaw: unit?.scoreRaw ?? null,
      totalTimeSeconds: unit?.sessionTimeSeconds ?? 0,
    },
    unit: {
      status: unit?.status ?? 'not_started',
      percent: unit?.percent ?? 0,
      completedAt: unit?.completedAt ?? null,
    },
  })
}

export type ScormState = Awaited<ReturnType<typeof getState>>

/**
 * Persists one Commit. The unit completes when the package reports completed AND passed with
 * at least the module pass mark; `writeUnit` sets `completedAt` only the first time.
 */
export async function commit(code: string, input: ScormCommitBody) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(courseCodeParam, { code }, 'param')
  const body = parseInput(scormCommitBody, input)
  scormPackage(code)
  const ctx = requireUnitContext(learnerId, body.programme, code)
  const extra = ctx.unit?.extra ?? {}
  const launches = { ...((extra.launches ?? {}) as Record<string, number>) }
  launches[body.launchId] = Math.max(launches[body.launchId] ?? 0, body.sessionTimeSeconds ?? 0)
  const kept = Object.entries(launches).slice(-MAX_LAUNCHES)
  const totalSeconds = kept.reduce((sum, [, seconds]) => sum + seconds, 0)

  const score = body.scoreRaw ?? ctx.unit?.scoreRaw ?? null
  const passed =
    body.cmiCompletionStatus === 'completed' &&
    body.cmiSuccessStatus === 'passed' &&
    (score ?? 0) >= THRESHOLDS.moduleQuizPass

  const result = writeUnit(ctx, {
    cmiCompletionStatus: body.cmiCompletionStatus,
    cmiSuccessStatus: body.cmiSuccessStatus ?? ctx.unit?.cmiSuccessStatus ?? 'unknown',
    scoreRaw: score,
    sessionTimeSeconds: totalSeconds,
    suspendData: body.suspendData ?? ctx.unit?.suspendData ?? null,
    location: body.location ?? ctx.unit?.location ?? null,
    percent: Math.round((Math.min(6, sceneNumber(body.location)) / 6) * 90),
    extra: { ...extra, launches: Object.fromEntries(kept) },
    complete: passed,
  })
  const enrolmentStatus = recomputeEnrolment(learnerId, body.programme)
  save()
  return out({
    unitStatus: result.unit.status,
    completedNow: result.completedNow,
    scoreRaw: result.unit.scoreRaw,
    totalTimeSeconds: totalSeconds,
    enrolmentStatus,
  })
}

/** Restart with confirmation: clears the resume point. A counted pass is never undone. */
export async function restart(programme: ProgrammeCode, code: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(courseCodeParam, { code }, 'param')
  parseInput(scormRestartBody, { programme })
  scormPackage(code)
  const ctx = requireUnitContext(learnerId, programme, code)
  if (!ctx.unit) return out({ restarted: true as const })
  writeUnit(ctx, {
    location: null,
    suspendData: null,
    cmiCompletionStatus: ctx.unit.status === 'completed' ? 'completed' : 'not attempted',
  })
  save()
  return out({ restarted: true as const })
}
