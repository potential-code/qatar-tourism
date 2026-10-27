import { db } from '@server/db/connection'
import { contentPackages, courses } from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import { recomputeEnrolment } from '@server/modules/progress/progress.service'
import { requireUnitContext, writeUnit } from '@server/modules/progress/progress.units'
import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import type { ScormCommitBody } from '@shared/schemas/learning-engine'
import { and, eq } from 'drizzle-orm'

/**
 * SCORM 2004 runtime persistence for the sample package (brief §8). The browser runs
 * scorm-again; this service stores the CMI fields in `unit_progress`, maps the outcome to the
 * unit and the enrolment, and counts a reported pass exactly once.
 */

const MAX_LAUNCHES = 50

/** The current SCORM 2004 package behind a course. Only SCORM packages have a runtime. */
export async function scormPackage(code: string) {
  const [row] = await db
    .select({
      title: contentPackages.title,
      type: contentPackages.type,
      version: contentPackages.version,
      launchUrl: contentPackages.launchUrl,
      formatLabel: contentPackages.formatLabel,
    })
    .from(contentPackages)
    .innerJoin(courses, eq(courses.id, contentPackages.courseId))
    .where(and(eq(courses.code, code), eq(contentPackages.isCurrent, true)))
    .limit(1)
  if (row?.type !== 'scorm_2004' || !row.launchUrl) {
    throw HttpError.notFound('No SCORM package for this unit')
  }
  return row
}

const sceneNumber = (location: string | null | undefined) => {
  const match = /scene-(\d+)/.exec(location ?? '')
  return match ? Number(match[1]) : 0
}

/** CMI values to initialise the runtime with, so closing and reopening resumes (brief §8). */
export async function getState(learnerId: string, programme: ProgrammeCode, code: string) {
  const pkg = await scormPackage(code)
  return db.transaction(async (tx) => {
    const { unit } = await requireUnitContext(tx, learnerId, programme, code)
    const resumable = Boolean(unit?.location || unit?.suspendData)
    return {
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
        completedAt: unit?.completedAt?.toISOString() ?? null,
      },
    }
  })
}

/**
 * Persists one Commit. The unit completes when the package reports completed AND passed with
 * at least the module pass mark; `writeUnit` sets `completed_at` only the first time.
 */
export async function commit(learnerId: string, code: string, body: ScormCommitBody) {
  await scormPackage(code)
  return db.transaction(async (tx) => {
    const ctx = await requireUnitContext(tx, learnerId, body.programme, code)
    const extra = (ctx.unit?.extra ?? {}) as Record<string, unknown>
    const launches = { ...((extra.launches ?? {}) as Record<string, number>) }
    launches[body.launchId] = Math.max(launches[body.launchId] ?? 0, body.sessionTimeSeconds ?? 0)
    const kept = Object.entries(launches).slice(-MAX_LAUNCHES)
    const totalSeconds = kept.reduce((sum, [, seconds]) => sum + seconds, 0)

    const score = body.scoreRaw ?? ctx.unit?.scoreRaw ?? null
    const passed =
      body.cmiCompletionStatus === 'completed' &&
      body.cmiSuccessStatus === 'passed' &&
      (score ?? 0) >= THRESHOLDS.moduleQuizPass

    const result = await writeUnit(tx, ctx, {
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
    const enrolmentStatus = await recomputeEnrolment(learnerId, body.programme, tx)
    return {
      unitStatus: result.unit.status,
      completedNow: result.completedNow,
      scoreRaw: result.unit.scoreRaw,
      totalTimeSeconds: totalSeconds,
      enrolmentStatus,
    }
  })
}

/** Restart with confirmation: clears the resume point. A counted pass is never undone. */
export async function restart(learnerId: string, programme: ProgrammeCode, code: string) {
  await scormPackage(code)
  return db.transaction(async (tx) => {
    const ctx = await requireUnitContext(tx, learnerId, programme, code)
    if (!ctx.unit) return { restarted: true as const }
    await writeUnit(tx, ctx, {
      location: null,
      suspendData: null,
      cmiCompletionStatus: ctx.unit.status === 'completed' ? 'completed' : 'not attempted',
    })
    return { restarted: true as const }
  })
}
